package com.monolith.crm.hrms.data.remote

// HRMS Mobile API network models.
// Matches the server-side API contracts from /api/mobile/hrms endpoints.

// --- Dashboard ---

data class HrmsDashboardResponse(
    val ok: Boolean,
    val data: HrmsDashboardData?
)

data class HrmsDashboardData(
    val user: DashboardUser,
    val attendance: AttendanceStatus,
    val faceEnrolled: Boolean,
    val agreementAccepted: Boolean,
    val trackingActive: Boolean,
    val onDutyActive: Boolean
)

data class DashboardUser(
    val id: String,
    val name: String,
    val email: String,
    val orgId: String?
)

data class AttendanceStatus(
    val isCheckedIn: Boolean,
    val sessionId: String?,
    val checkInTime: String?,
    val workingMinutes: Int?,
    val location: LocationData?
)

data class LocationData(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val address: String?
)

// --- Check-In / Check-Out ---

data class CheckInRequest(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val faceDescriptor: List<Float>?,
    val faceConfidence: Float?,
    val deviceInfo: DeviceInfo?
)

data class CheckInResponse(
    val ok: Boolean,
    val data: CheckInData?,
    val error: String?
)

data class CheckInData(
    val sessionId: String,
    val checkInTime: String,
    val isWithinGeofence: Boolean?
)

data class CheckOutRequest(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val faceDescriptor: List<Float>?,
    val faceConfidence: Float?,
    val sessionId: String?
)

data class CheckOutResponse(
    val ok: Boolean,
    val data: CheckOutData?,
    val error: String?
)

data class CheckOutData(
    val sessionId: String,
    val checkOutTime: String,
    val workingMinutes: Int,
    val totalHours: String
)

data class DeviceInfo(
    val model: String,
    val os: String,
    val appVersion: String,
    val isMockLocation: Boolean
)

// --- Attendance History ---

data class AttendanceHistoryResponse(
    val ok: Boolean,
    val data: AttendanceHistoryData?
)

data class AttendanceHistoryData(
    val sessions: List<AttendanceSession>,
    val total: Int,
    val page: Int,
    val pageSize: Int
)

data class AttendanceSession(
    val id: String,
    val date: String,
    val checkInTime: String?,
    val checkOutTime: String?,
    val workingMinutes: Int?,
    val status: String,
    val checkInLocation: LocationData?,
    val checkOutLocation: LocationData?
)

// --- Face Enrollment ---

data class FaceEnrollmentStatusResponse(
    val ok: Boolean,
    val data: FaceEnrollmentStatus?
)

data class FaceEnrollmentStatus(
    val enrolled: Boolean,
    val enrolledAt: String?,
    val descriptorCount: Int?
)

data class FaceEnrollRequest(
    val descriptor: List<Float>,
    val captureQuality: Float?,
    val deviceInfo: DeviceInfo?
)

data class FaceEnrollResponse(
    val ok: Boolean,
    val data: FaceEnrollResultData?,
    val error: String?
)

data class FaceEnrollResultData(
    val enrollmentId: String,
    val enrolledAt: String
)

// --- Tracking / Heartbeat ---

data class TrackingStatusResponse(
    val ok: Boolean,
    val data: TrackingStatusData?
)

data class TrackingStatusData(
    val isTracking: Boolean,
    val sessionId: String?,
    val sessionType: String?,
    val startedAt: String?,
    val lastHeartbeat: String?,
    val workingHoursStart: String?,
    val workingHoursEnd: String?
)

data class TrackingHeartbeatRequest(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val altitude: Double?,
    val speed: Float?,
    val bearing: Float?,
    val batteryLevel: Int?,
    val isMockLocation: Boolean,
    val sessionType: String? // "WORKING_HOURS" | "ON_DUTY"
)

data class TrackingHeartbeatResponse(
    val ok: Boolean,
    val data: HeartbeatResultData?,
    val error: String?
)

data class HeartbeatResultData(
    val pointId: String,
    val nextHeartbeatSeconds: Int?
)

// --- On-Duty ---

data class OnDutyListResponse(
    val ok: Boolean,
    val data: List<OnDutyRequestData>?
)

data class OnDutyRequestData(
    val id: String,
    val status: String,
    val purpose: String?,
    val visitLocation: String?,
    val visitAddress: String?,
    val fromDate: String,
    val toDate: String,
    val startedAt: String?,
    val completedAt: String?,
    val totalDistanceKm: Double?,
    val createdAt: String
)

data class OnDutyActionRequest(
    val action: String, // "create" | "start" | "complete" | "claim_reimbursement"
    val requestId: String?,
    val purpose: String?,
    val visitLocation: String?,
    val visitAddress: String?,
    val fromDate: String?,
    val toDate: String?,
    val latitude: Double?,
    val longitude: Double?,
    val distanceKm: Double?,
    val notes: String?
)

data class OnDutyActionResponse(
    val ok: Boolean,
    val data: OnDutyActionResult?,
    val error: String?
)

data class OnDutyActionResult(
    val requestId: String?,
    val claimId: String?,
    val status: String?,
    val message: String?
)

// --- Agreement ---

data class AgreementResponse(
    val ok: Boolean,
    val data: AgreementData?
)

data class AgreementData(
    val agreement: AgreementContent?,
    val accepted: Boolean,
    val acceptedAt: String?
)

data class AgreementContent(
    val id: String,
    val version: Int,
    val title: String,
    val content: String,
    val effectiveDate: String
)

data class AgreementAcceptRequest(
    val agreementId: String,
    val deviceInfo: DeviceInfo?
)

data class AgreementAcceptResponse(
    val ok: Boolean,
    val error: String?
)
