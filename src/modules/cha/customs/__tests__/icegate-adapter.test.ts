import { createDecipheriv, generateKeyPairSync, privateDecrypt, constants, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { invalidateRbacCache } from "@/lib/rbac";
import { loadIcegateConfig } from "../icegate/config.server";
import { buildIcegateIdempotencyKey, encryptIcegateCredentials } from "../icegate/crypto.server";
import { MockIcegateClient } from "../icegate/mock-client.server";
import { classifyIcegateError, redactIcegateValue } from "../icegate/redaction";
import { submitGeneratedIcegateFile } from "../icegate/service.server";
import { RealIcegateClient } from "../icegate/client.server";
import { getChaCustomsFeatureFlagsSettingKey } from "../feature-flags";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock("server-only", () => ({}));

const runId = Date.now().toString(36);

describe("ICEGATE server adapter boundary", () => {
  let orgDisabledId: string;
  let orgEnabledId: string;
  let orgDeniedId: string;
  let deniedUserId: string;
  let permittedUserId: string;
  let disabledFlatFileId: string;
  let enabledFlatFileId: string;
  let enabledJobId: string;

  const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicCertificate = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKey = keyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  async function createFixture(label: string, withSubmitPermission: boolean, enableFlags: boolean) {
    const org = await db.organisation.create({
      data: { name: `ICEGATE ${label} ${runId}`, slug: `icegate-${label.toLowerCase()}-${runId}` },
    });
    const branch = await db.branch.create({
      data: { orgId: org.id, name: `${label} Branch`, code: `IG${label.slice(0, 2).toUpperCase()}${runId}` },
    });
    const user = await db.user.create({
      data: {
        orgId: org.id,
        email: `icegate-${label}-${runId}@test.local`,
        passwordHash: "test",
        name: `${label} ICEGATE User`,
        active: true,
      },
    });
    const customer = await db.crmAccount.create({
      data: {
        orgId: org.id,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id,
        name: `${label} ICEGATE Customer`,
        type: "Customer",
      },
    });
    const jobType = await db.chaJobType.create({
      data: {
        orgId: org.id,
        name: `${label} ICEGATE Filing`,
        movementDirection: "IMPORT",
        filingFlowCategory: "IMPORT_BE",
      },
    });
    const job = await db.chaJob.create({
      data: {
        orgId: org.id,
        jobNumber: `ICE-${label}-${runId}`,
        title: `${label} ICEGATE filing`,
        customerId: customer.id,
        jobTypeId: jobType.id,
        branchId: branch.id,
        primaryOwnerId: user.id,
      },
    });
    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: job.id,
        movementDirection: "IMPORT",
        filingType: "HOME_CONSUMPTION",
        transportMode: "SEA",
        customsHouseCode: "INMAA1",
      },
    });
    const flatFile = await db.chaCustomsFlatFileGeneration.create({
      data: {
        profileId: profile.id,
        versionNo: 1,
        checksum: `checksum-${label}-${runId}`,
        contentHash: `content-${label}-${runId}`,
        fileName: `${label}-${runId}.json`,
        generatedById: user.id,
      },
    });

    if (withSubmitPermission) {
      const permission = await db.permission.upsert({
        where: { key: "cha.customs.icegate.submit" },
        update: {},
        create: {
          key: "cha.customs.icegate.submit",
          label: "Submit to ICEGATE",
          group: "CHA Customs",
        },
      });
      const role = await db.role.create({
        data: { orgId: org.id, name: `ICEGATE Submitter ${label} ${runId}` },
      });
      await db.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
      await db.userRole.create({
        data: { roleId: role.id, userId: user.id },
      });
      invalidateRbacCache();
    }

    if (enableFlags) {
      await db.systemSetting.create({
        data: {
          key: getChaCustomsFeatureFlagsSettingKey(org.id),
          value: JSON.stringify({
            CHA_ICEGATE_INTEGRATION: true,
            CHA_ICEGATE_LIVE_SUBMISSION: true,
          }),
        },
      });
    }

    return { org, user, job, flatFile };
  }

  beforeAll(async () => {
    const disabled = await createFixture("Disabled", true, false);
    const enabled = await createFixture("Enabled", true, true);
    const denied = await createFixture("Denied", false, true);

    orgDisabledId = disabled.org.id;
    orgEnabledId = enabled.org.id;
    orgDeniedId = denied.org.id;
    permittedUserId = enabled.user.id;
    deniedUserId = denied.user.id;
    disabledFlatFileId = disabled.flatFile.id;
    enabledFlatFileId = enabled.flatFile.id;
    enabledJobId = enabled.job.id;
  });

  afterAll(async () => {
    const orgIds = [orgDisabledId, orgEnabledId, orgDeniedId].filter(Boolean);
    await db.chaCustomsExternalEvent.deleteMany({
      where: { submission: { profile: { job: { orgId: { in: orgIds } } } } },
    });
    await db.chaCustomsExternalSubmission.deleteMany({
      where: { profile: { job: { orgId: { in: orgIds } } } },
    });
    await db.chaCustomsFlatFileGeneration.deleteMany({
      where: { profile: { job: { orgId: { in: orgIds } } } },
    });
    await db.chaCustomsFilingProfile.deleteMany({
      where: { job: { orgId: { in: orgIds } } },
    });
    await db.chaJob.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.crmAccount.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaJobType.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.userRole.deleteMany({ where: { userId: { in: [permittedUserId, deniedUserId].filter(Boolean) } } });
    await db.rolePermission.deleteMany({
      where: { role: { name: { contains: `ICEGATE Submitter` } } },
    });
    await db.role.deleteMany({
      where: { orgId: { in: orgIds }, name: { contains: `ICEGATE Submitter` } },
    });
    await db.systemSetting.deleteMany({
      where: { key: { in: orgIds.map((id) => getChaCustomsFeatureFlagsSettingKey(id)) } },
    });
    await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.branch.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.organisation.deleteMany({ where: { id: { in: orgIds } } });
    invalidateRbacCache();
  });

  it("reports incomplete configuration without exposing secret values", () => {
    const config = loadIcegateConfig({ ICEGATE_API_KEY: "present-but-not-sufficient" } as NodeJS.ProcessEnv);

    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(expect.arrayContaining([
      "ICEGATE_ID",
      "ICEGATE_PASSWORD",
    ]));
    expect(config.publicCertificate).toBeNull();
  });

  it("encrypts credentials with the documented RSA-OAEP and AES envelope", () => {
    const aesKey = Buffer.alloc(16, 1);
    const envelope = encryptIcegateCredentials({
      icegateId: "IcegateID123",
      password: "Password@123",
      publicCertificate,
      aesKey,
    });
    const [encryptedKey, encryptedPayload] = envelope.data.split(":");
    const decryptedKey = privateDecrypt({
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from(encryptedKey, "base64"));
    const decipher = createDecipheriv("aes-128-ecb", decryptedKey, null);
    const decryptedPayload = Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload, "base64")),
      decipher.final(),
    ]).toString("utf8");

    expect(decryptedKey.equals(aesKey)).toBe(true);
    expect(JSON.parse(decryptedPayload)).toEqual({
      icegateID: "IcegateID123",
      password: "Password@123",
    });
  });

  it("caches and renews authentication tokens", async () => {
    let fetchCount = 0;
    const config = loadIcegateConfig({
      ICEGATE_BASE_URL: "https://example.test",
      ICEGATE_ID: "IcegateID123",
      ICEGATE_PASSWORD: "Password@123",
      ICEGATE_PUBLIC_CERT_PEM: publicCertificate,
    } as NodeJS.ProcessEnv);
    const client = new RealIcegateClient(config, (async () => {
      fetchCount += 1;
      return Response.json({
        status: "SUCCESS",
        accessToken: `token-${fetchCount}`,
        tokenExpiresIn: "2099.01.01 00:00:00",
      });
    }) as typeof fetch);

    const first = await client.acquireToken();
    const second = await client.acquireToken();
    const renewed = await client.renewToken();

    expect(first.accessToken).toBe(second.accessToken);
    expect(renewed.accessToken).toBe("token-2");
    expect(fetchCount).toBe(2);
  });

  it("redacts sensitive ICEGATE fields and classifies retryable errors", () => {
    expect(redactIcegateValue({
      accessToken: "token",
      nested: { password: "password", safe: "visible" },
    })).toEqual({
      accessToken: "[REDACTED]",
      nested: { password: "[REDACTED]", safe: "visible" },
    });

    expect(classifyIcegateError(new DOMException("Timed out", "AbortError"))).toBe("TIMEOUT");
    expect(classifyIcegateError(new Error("ECONNRESET"))).toBe("TRANSIENT_FAILURE");
    expect(classifyIcegateError(new Error("Validation failed"))).toBe("PERMANENT_FAILURE");
  });

  it("generates deterministic submission idempotency keys", () => {
    const base = {
      orgId: "org_1",
      jobId: "job_1",
      documentType: "BE" as const,
      generationVersion: 1,
    };

    expect(buildIcegateIdempotencyKey(base)).toBe(buildIcegateIdempotencyKey(base));
    expect(buildIcegateIdempotencyKey({ ...base, generationVersion: 2 })).not.toBe(buildIcegateIdempotencyKey(base));
  });

  it("maps deterministic mock fixtures without live network calls", async () => {
    const positive = await new MockIcegateClient("positive_be_acknowledgement").submitBillOfEntryFile({
      documentType: "BE",
      fileName: "be.json",
      content: new TextEncoder().encode("{}"),
      idempotencyKey: randomUUID(),
    });
    const negative = await new MockIcegateClient("negative_sb_acknowledgement").submitShippingBillFile({
      documentType: "SB",
      fileName: "sb.json",
      content: new TextEncoder().encode("{}"),
      idempotencyKey: randomUUID(),
    });
    const timeout = await new MockIcegateClient("timeout").submitBillOfEntryFile({
      documentType: "BE",
      fileName: "be.json",
      content: new TextEncoder().encode("{}"),
      idempotencyKey: randomUUID(),
    });

    expect(positive.validationStatus).toBe("SUCCESS");
    expect(negative.validationStatus).toBe("FAILED");
    expect(timeout.retryable).toBe(true);
  });

  it("denies submission when RBAC permission is missing", async () => {
    await expect(submitGeneratedIcegateFile({
      actorId: deniedUserId,
      orgId: orgEnabledId,
      jobId: enabledJobId,
      flatFileGenerationId: enabledFlatFileId,
      documentType: "BE",
      client: new MockIcegateClient(),
    })).rejects.toThrow("Forbidden");
  });

  it("denies submission when the live feature flag is disabled", async () => {
    const flatFile = await db.chaCustomsFlatFileGeneration.findUniqueOrThrow({
      where: { id: disabledFlatFileId },
      include: { profile: true },
    });

    await expect(submitGeneratedIcegateFile({
      actorId: permittedUserId,
      orgId: orgDisabledId,
      jobId: flatFile.profile.jobId,
      flatFileGenerationId: disabledFlatFileId,
      documentType: "BE",
      client: new MockIcegateClient(),
    })).rejects.toThrow("feature flag is disabled");
  });

  it("persists a pre-send submission record and prevents duplicate generated-version submission", async () => {
    const first = await submitGeneratedIcegateFile({
      actorId: permittedUserId,
      orgId: orgEnabledId,
      jobId: enabledJobId,
      flatFileGenerationId: enabledFlatFileId,
      documentType: "BE",
      client: new MockIcegateClient("positive_be_acknowledgement"),
    });

    await expect(submitGeneratedIcegateFile({
      actorId: permittedUserId,
      orgId: orgEnabledId,
      jobId: enabledJobId,
      flatFileGenerationId: enabledFlatFileId,
      documentType: "BE",
      client: new MockIcegateClient("positive_be_acknowledgement"),
    })).rejects.toThrow("already has a live ICEGATE submission");

    const events = await db.chaCustomsExternalEvent.findMany({
      where: { submissionId: first.submissionId },
      orderBy: { sequenceNo: "asc" },
    });

    expect(first.status).toBe("ACKNOWLEDGED");
    expect(events.map((event) => event.eventKind)).toEqual(["REQUEST_PREPARED", "ACKNOWLEDGED"]);
  });

  it("keeps ICEGATE secret values out of adapter source and server-only modules", () => {
    const files = [
      "config.server.ts",
      "crypto.server.ts",
      "client.server.ts",
      "mock-client.server.ts",
      "service.server.ts",
      "diagnostics.server.ts",
    ].map((file) => join(process.cwd(), "src", "modules", "cha", "customs", "icegate", file));
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    const secret = process.env.ICEGATE_API_KEY;

    for (const file of files) {
      expect(readFileSync(file, "utf8")).toContain('import "server-only"');
    }
    if (secret) {
      expect(source.includes(secret)).toBe(false);
    }
  });
});
