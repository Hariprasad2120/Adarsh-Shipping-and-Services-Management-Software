/**
 * User Agreement / Consent Service
 *
 * Manages versioned user agreements for HRMS mobile features
 * (attendance tracking, face recognition, location tracking).
 *
 * NOTE: The agreement content below is a developer draft.
 * Final legal wording should be reviewed by HR/legal counsel
 * for compliance with applicable Indian employment and data protection laws.
 */
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import crypto from "crypto";

// ─── Default Agreement Content ────────────────────────────────────────────────

export const DEFAULT_AGREEMENT_CONTENT = `
EMPLOYEE MOBILE APPLICATION — DATA COLLECTION & PRIVACY AGREEMENT
Version 1.0

This agreement governs the use of the company's mobile application ("App") for attendance management, location tracking, and facial recognition. By accepting this agreement, you consent to the data collection and processing practices described below.

1. ATTENDANCE DATA COLLECTION
The App collects attendance data including check-in and check-out timestamps, source of check-in (mobile, biometric, or web), and associated metadata. This data is used for payroll processing, compliance, and workforce management.

2. FACIAL RECOGNITION
The App uses facial recognition technology to verify employee identity during check-in and check-out. Face biometric data (facial descriptors/embeddings) is encrypted using AES-256-GCM and stored securely. Raw face images are not stored. Biometric data is used solely for identity verification and is not shared with third parties.

3. LOCATION TRACKING — CHECK-IN/CHECK-OUT
The App captures your GPS location during check-in and check-out events. This location data includes latitude, longitude, accuracy, and timestamp. It is used to verify attendance at designated work locations.

4. HOURLY LOCATION TRACKING DURING WORKING HOURS
After check-in, the App captures your location automatically every one (1) hour during your assigned working hours. This tracking is used for workforce management and safety purposes. Location tracking automatically stops after checkout, shift end, or when working hours conclude. The App does NOT track employees outside working hours.

5. ON-DUTY LIVE TRACKING
When you are on an approved on-duty trip, the App captures your location more frequently (approximately every 5 minutes) to record your route for official movement verification, safety, and fuel reimbursement calculation. Your reporting manager and admin may view your live location during active on-duty trips. Live tracking stops automatically when you complete your on-duty trip.

6. LOCATION PERMISSION & GPS
If you disable location permissions or GPS during active tracking or on-duty, the App will display a warning. Your reporting manager and admin may be notified of the interruption. You will not be able to start or complete on-duty trips without valid location permissions.

7. FUEL REIMBURSEMENT
Fuel reimbursement may be calculated based on the distance tracked during completed on-duty trips, using the company's configured reimbursement rate per kilometer.

8. DATA SECURITY
All sensitive data (biometric, location, attendance) is encrypted in transit (HTTPS) and at rest. Access to sensitive tracking history is restricted to authorized administrators and reporting managers. The company implements role-based access controls, audit logging, and encryption for all personal data.

9. DATA RETENTION
Attendance and location data is retained for the period configured by the company administrator, in accordance with applicable employment regulations. You may contact HR/admin for questions, data correction, or deletion requests as permitted by company policy and applicable law.

10. NO TRACKING OUTSIDE WORKING HOURS
The company commits that location tracking will NOT occur outside your assigned working hours. Tracking automatically stops at shift end, checkout, or when on-duty trips are completed.

11. DEVICE INFORMATION
The App may collect device information (device model, OS version, app version) for technical support, compatibility, and security purposes.

12. CONSENT
By accepting this agreement, you confirm that you understand and consent to the data collection practices described above. You may withdraw consent at any time by contacting HR, though this may affect your ability to use certain App features.

13. MODIFICATIONS
This agreement may be updated from time to time. You will be required to review and accept any updated versions before continuing to use the App.

14. CONTACT
For questions about this agreement, data practices, or to exercise your data rights, contact the HR Department.

---
IMPORTANT DEVELOPER NOTE: This is a template agreement drafted for development purposes. The final version MUST be reviewed and approved by qualified HR/legal counsel for compliance with the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 (if applicable), applicable labour laws, and any other relevant Indian employment and data protection regulations before deployment.
`.trim();

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getLatestAgreement(orgId: string) {
  return db.userAgreementVersion.findFirst({
    where: { orgId, isActive: true },
    orderBy: { version: "desc" },
  });
}

export async function createAgreementVersion(
  orgId: string,
  title: string,
  content: string,
  createdById: string
) {
  const now = await getNow();

  // Deactivate previous versions
  await db.userAgreementVersion.updateMany({
    where: { orgId, isActive: true },
    data: { isActive: false },
  });

  // Get next version number
  const lastVersion = await db.userAgreementVersion.findFirst({
    where: { orgId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const version = (lastVersion?.version ?? 0) + 1;
  const contentHash = crypto.createHash("sha256").update(content).digest("hex");

  const agreement = await db.userAgreementVersion.create({
    data: {
      orgId,
      version,
      title,
      content,
      contentHash,
      effectiveFrom: now,
      isActive: true,
      createdById,
    },
  });

  return agreement;
}

export async function seedDefaultAgreement(orgId: string, createdById: string) {
  const existing = await getLatestAgreement(orgId);
  if (existing) return existing;

  return createAgreementVersion(
    orgId,
    "Employee Mobile Application — Data Collection & Privacy Agreement",
    DEFAULT_AGREEMENT_CONTENT,
    createdById
  );
}

export async function checkUserAcceptance(userId: string, orgId: string) {
  const latestAgreement = await getLatestAgreement(orgId);
  if (!latestAgreement) {
    return { required: false, accepted: true, agreement: null };
  }

  const acceptance = await db.userAgreementAcceptance.findUnique({
    where: {
      userId_agreementVersionId: {
        userId,
        agreementVersionId: latestAgreement.id,
      },
    },
  });

  return {
    required: true,
    accepted: !!acceptance,
    agreement: latestAgreement,
    acceptance,
  };
}

export async function recordAcceptance(
  userId: string,
  orgId: string,
  agreementVersionId: string,
  ip?: string,
  deviceId?: string,
  userAgent?: string
) {
  const now = await getNow();

  const acceptance = await db.userAgreementAcceptance.upsert({
    where: {
      userId_agreementVersionId: {
        userId,
        agreementVersionId,
      },
    },
    create: {
      orgId,
      userId,
      agreementVersionId,
      acceptedAt: now,
      ipAddress: ip,
      deviceId,
      userAgent,
    },
    update: {
      acceptedAt: now,
      ipAddress: ip,
      deviceId,
      userAgent,
    },
  });

  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: "AGREEMENT_ACCEPTED",
      details: {
        agreementVersionId,
        ip,
        deviceId,
        timestamp: now.toISOString(),
      },
    },
  });

  return acceptance;
}

export async function getAcceptanceReport(orgId: string) {
  const latestAgreement = await getLatestAgreement(orgId);
  if (!latestAgreement) return { agreement: null, users: [] };

  const users = await db.user.findMany({
    where: { orgId, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
      agreementAcceptances: {
        where: { agreementVersionId: latestAgreement.id },
        select: { acceptedAt: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    agreement: latestAgreement,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      employeeNumber: u.employeeNumber,
      accepted: u.agreementAcceptances.length > 0,
      acceptedAt: u.agreementAcceptances[0]?.acceptedAt ?? null,
    })),
  };
}

export async function listAgreementVersions(orgId: string) {
  return db.userAgreementVersion.findMany({
    where: { orgId },
    orderBy: { version: "desc" },
    include: {
      _count: { select: { acceptances: true } },
    },
  });
}
