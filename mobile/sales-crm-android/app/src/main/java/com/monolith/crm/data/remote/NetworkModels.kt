package com.monolith.crm.data.remote

data class LoginRequest(val email: String, val password: String)
data class UserMetadata(val id: String, val email: String, val name: String, val orgId: String?, val roles: List<String>)
data class LoginResponse(val token: String, val user: UserMetadata)

data class LeadOwner(
    val id: String,
    val name: String?,
    val email: String?
)

data class LeadMetadata(
    val id: String,
    val firstName: String?,
    val lastName: String,
    val company: String,
    val designation: String?,
    val email: String?,
    val phone: String?,
    val mobile: String?,
    val status: String,
    val source: String?,
    val industry: String?,
    val description: String?,
    val notInterestedReason: String?,
    val updatedAt: String?,
    val createdAt: String?,
    val owner: LeadOwner?
) {
    val fullName: String
        get() = "${firstName ?: ""} $lastName".trim()
}

data class LeadsResponse(val leads: List<LeadMetadata>)

data class CallAttemptRequest(val customerPhone: String)
data class CallAttemptResponse(val callAttemptId: String)

data class CompleteAttemptRequest(val durationSeconds: Int, val status: String)
data class CompleteAttemptResponse(val success: Boolean)

data class RecordingMetadata(val id: String, val fileName: String, val uploadStatus: String, val transcriptionStatus: String)
data class UploadRecordingResponse(val success: Boolean, val duplicate: Boolean, val message: String?, val recording: RecordingMetadata?)

// Lead status update models
data class UpdateLeadStatusRequest(
    val status: String,
    val reason: String? = null,
    val enquiryDetails: Map<String, Any?>? = null
)
data class UpdateLeadStatusResponse(val success: Boolean, val lead: LeadMetadata?)

data class RecordingStatusRequest(
    val uploadStatus: String,
    val uploadProgress: Int? = null,
    val errorMessage: String? = null,
    val fileName: String? = null,
    val fileSize: Long? = null,
    val sha256Hash: String? = null
)
data class RecordingStatusResponse(val success: Boolean)

data class MonaChatRequest(
    val message: String,
    val currentPath: String? = null,
    val sessionId: String? = null,
    val action: String? = null
)

data class MonaChatResponse(
    val content: String,
    val toolsUsed: List<String>
)

data class AppUpdateResponse(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val changelog: List<String>
)


