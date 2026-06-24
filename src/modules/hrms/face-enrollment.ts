/**
 * Face Enrollment Service
 *
 * Manages face biometric enrollment, verification, and reset.
 * Uses encrypted storage for face descriptor data.
 *
 * NOTE: This service handles the server-side storage and matching of
 * face descriptors. The actual face detection and descriptor extraction
 * happens on the client (via face-api.js for web, or native SDK for Android).
 * The client sends a Float32Array descriptor which is stored encrypted.
 */
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { createNotification } from "@/modules/notifications/service";
import crypto from "crypto";

// ─── Encryption Helpers ───────────────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.FACE_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

function encrypt(data: string): { encrypted: string; iv: string; tag: string } {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

function decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex");
  const iv = Buffer.from(encryptedData.iv, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ─── Face Enrollment ──────────────────────────────────────────────────────────

export type FaceDescriptor = number[];

export async function enrollFace(
  userId: string,
  orgId: string,
  descriptor: FaceDescriptor,
  enrolledVia: string = "mobile"
) {
  const now = await getNow();

  // Encrypt the descriptor
  const descriptorJson = JSON.stringify(descriptor);
  const encrypted = encrypt(descriptorJson);
  const descriptorHash = crypto
    .createHash("sha256")
    .update(descriptorJson)
    .digest("hex");

  // Upsert enrollment (one enrollment per user)
  const enrollment = await db.employeeFaceEnrollment.upsert({
    where: { userId },
    create: {
      orgId,
      userId,
      enrollmentData: encrypted,
      enrollmentHash: descriptorHash,
      enrolledAt: now,
      enrolledVia,
      isActive: true,
      auditTrail: [
        {
          timestamp: now.toISOString(),
          action: "ENROLLED",
          via: enrolledVia,
        },
      ],
    },
    update: {
      enrollmentData: encrypted,
      enrollmentHash: descriptorHash,
      enrolledAt: now,
      enrolledVia,
      isActive: true,
      auditTrail: {
        // Will be appended via raw update below
      },
    },
  });

  // If it was an update, append to audit trail
  if (enrollment.createdAt < now) {
    const existingTrail = Array.isArray(enrollment.auditTrail) ? enrollment.auditTrail : [];
    await db.employeeFaceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        auditTrail: [
          ...existingTrail as any[],
          {
            timestamp: now.toISOString(),
            action: "RE_ENROLLED",
            via: enrolledVia,
          },
        ],
      },
    });
  }

  // Audit log
  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: "FACE_ENROLLED",
      details: {
        enrollmentId: enrollment.id,
        enrolledVia,
        timestamp: now.toISOString(),
      },
    },
  });

  return { success: true, enrollmentId: enrollment.id };
}

// ─── Face Verification ────────────────────────────────────────────────────────

/**
 * Euclidean distance between two descriptors.
 * Lower distance = better match.
 * Typical threshold: 0.6 (strict) to 0.7 (lenient).
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

const MATCH_THRESHOLD = 0.6; // Configurable

export async function verifyFace(
  userId: string,
  orgId: string,
  liveDescriptor: FaceDescriptor
): Promise<{
  verified: boolean;
  confidence: number;
  distance: number;
}> {
  const enrollment = await db.employeeFaceEnrollment.findFirst({
    where: { userId, isActive: true },
  });

  if (!enrollment) {
    // Log failed attempt
    await db.hrmsAuditLog.create({
      data: {
        orgId,
        userId,
        action: "FACE_VERIFY_NO_ENROLLMENT",
        details: { timestamp: new Date().toISOString() },
      },
    });
    return { verified: false, confidence: 0, distance: Infinity };
  }

  // Decrypt stored descriptor
  const encryptedData = enrollment.enrollmentData as {
    encrypted: string;
    iv: string;
    tag: string;
  };

  let storedDescriptor: FaceDescriptor;
  try {
    const decrypted = decrypt(encryptedData);
    storedDescriptor = JSON.parse(decrypted);
  } catch {
    await db.hrmsAuditLog.create({
      data: {
        orgId,
        userId,
        action: "FACE_VERIFY_DECRYPT_FAILED",
        details: { enrollmentId: enrollment.id },
      },
    });
    return { verified: false, confidence: 0, distance: Infinity };
  }

  const distance = euclideanDistance(storedDescriptor, liveDescriptor);
  const verified = distance < MATCH_THRESHOLD;
  // Convert distance to a 0-1 confidence score (1 = perfect match)
  const confidence = Math.max(0, Math.min(1, 1 - distance / MATCH_THRESHOLD));

  // Audit
  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: verified ? "FACE_VERIFY_SUCCESS" : "FACE_VERIFY_FAILED",
      details: {
        enrollmentId: enrollment.id,
        distance: Math.round(distance * 1000) / 1000,
        confidence: Math.round(confidence * 100) / 100,
        threshold: MATCH_THRESHOLD,
      },
    },
  });

  // Notify admin on repeated failures
  if (!verified) {
    const recentFailures = await db.hrmsAuditLog.count({
      where: {
        userId,
        action: "FACE_VERIFY_FAILED",
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
      },
    });

    if (recentFailures >= 3) {
      const user = await db.user.findFirst({
        where: { id: userId },
        select: { name: true, managerId: true },
      });

      if (user?.managerId) {
        await createNotification({
          userId: user.managerId,
          orgId,
          kind: "HRMS_FACE_AUTH_FAILED",
          title: "Repeated Face Auth Failures",
          body: `${user.name} has had ${recentFailures} failed face authentication attempts in the last 30 minutes.`,
          link: "/hrms/tracking",
          priority: "important",
        });
      }
    }
  }

  return { verified, confidence, distance };
}

// ─── Admin: Reset Face Enrollment ─────────────────────────────────────────────

export async function resetFaceEnrollment(
  userId: string,
  orgId: string,
  adminId: string,
  reason?: string
) {
  const now = await getNow();

  const enrollment = await db.employeeFaceEnrollment.findFirst({
    where: { userId },
  });

  if (!enrollment) {
    throw new Error("No face enrollment found for this employee.");
  }

  const existingTrail = Array.isArray(enrollment.auditTrail) ? enrollment.auditTrail : [];

  await db.employeeFaceEnrollment.update({
    where: { id: enrollment.id },
    data: {
      isActive: false,
      resetById: adminId,
      resetAt: now,
      auditTrail: [
        ...existingTrail as any[],
        {
          timestamp: now.toISOString(),
          action: "RESET_BY_ADMIN",
          adminId,
          reason: reason || "Admin reset",
        },
      ],
    },
  });

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId: adminId,
      action: "FACE_ENROLLMENT_RESET",
      details: {
        targetUserId: userId,
        enrollmentId: enrollment.id,
        reason: reason || "Admin reset",
      },
    },
  });

  return { success: true };
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function getFaceEnrollmentStatus(userId: string) {
  const enrollment = await db.employeeFaceEnrollment.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      enrolledAt: true,
      enrolledVia: true,
      isActive: true,
    },
  });

  return {
    isEnrolled: !!enrollment,
    enrollment,
  };
}

export async function listFaceEnrollments(orgId: string) {
  return db.employeeFaceEnrollment.findMany({
    where: { orgId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      enrolledAt: true,
      enrolledVia: true,
      resetById: true,
      resetAt: true,
      user: { select: { id: true, name: true, email: true, employeeNumber: true } },
    },
    orderBy: { enrolledAt: "desc" },
  });
}
