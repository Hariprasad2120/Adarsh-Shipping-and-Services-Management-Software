import "server-only";
import { constants, createCipheriv, createHash, publicEncrypt, randomBytes } from "node:crypto";

export function encryptIcegateCredentials(params: {
  icegateId: string;
  password: string;
  publicCertificate: string;
  aesKey?: Buffer;
}) {
  const json = JSON.stringify({ icegateID: params.icegateId, password: params.password });
  const aesKey = params.aesKey ?? randomBytes(16);
  const encryptedKey = publicEncrypt(
    {
      key: params.publicCertificate,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey,
  ).toString("base64");
  const cipher = createCipheriv("aes-128-ecb", aesKey, null);
  const encryptedPayload = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]).toString("base64");
  return { data: `${encryptedKey}:${encryptedPayload}` };
}

export function sha256Base64(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("base64url");
}

export function buildIcegateIdempotencyKey(params: {
  orgId: string;
  jobId: string;
  documentType: string;
  generationVersion: number;
}) {
  return sha256Base64(`${params.orgId}:${params.jobId}:${params.documentType}:${params.generationVersion}`);
}
