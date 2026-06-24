package com.monolith.crm.data.remote

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface CrmApiService {

    @POST("api/mobile/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("api/mobile/crm/leads")
    suspend fun getAssignedLeads(
        @Header("Authorization") token: String
    ): Response<LeadsResponse>

    @POST("api/mobile/crm/leads/{leadId}/call-attempts")
    suspend fun startCallAttempt(
        @Header("Authorization") token: String,
        @Path("leadId") leadId: String,
        @Body request: CallAttemptRequest
    ): Response<CallAttemptResponse>

    @PATCH("api/mobile/crm/call-attempts/{callAttemptId}/complete")
    suspend fun completeCallAttempt(
        @Header("Authorization") token: String,
        @Path("callAttemptId") callAttemptId: String,
        @Body request: CompleteAttemptRequest
    ): Response<CompleteAttemptResponse>

    @Multipart
    @POST("api/mobile/crm/call-attempts/{callAttemptId}/recording")
    suspend fun uploadRecording(
        @Header("Authorization") token: String,
        @Path("callAttemptId") callAttemptId: String,
        @Part file: MultipartBody.Part,
        @Part("fileName") fileName: RequestBody,
        @Part("mimeType") mimeType: RequestBody,
        @Part("fileSize") fileSize: RequestBody,
        @Part("durationSeconds") durationSeconds: RequestBody,
        @Part("recordedAt") recordedAt: RequestBody,
        @Part("sha256Hash") sha256Hash: RequestBody,
        @Part("matchConfidence") matchConfidence: RequestBody,
        @Part("matchReason") matchReason: RequestBody
    ): Response<UploadRecordingResponse>

    @PATCH("api/mobile/crm/leads/{leadId}/status")
    suspend fun updateLeadStatus(
        @Header("Authorization") token: String,
        @Path("leadId") leadId: String,
        @Body request: UpdateLeadStatusRequest
    ): Response<UpdateLeadStatusResponse>

    @PATCH("api/mobile/crm/call-attempts/{callAttemptId}/recording/status")
    suspend fun updateRecordingStatus(
        @Header("Authorization") token: String,
        @Path("callAttemptId") callAttemptId: String,
        @Body request: RecordingStatusRequest
    ): Response<RecordingStatusResponse>

    @POST("api/mobile/mona/chat")
    suspend fun chatWithMona(
        @Header("Authorization") token: String,
        @Body request: MonaChatRequest
    ): Response<MonaChatResponse>

    @GET("api/mobile/crm/update")
    suspend fun checkUpdate(): Response<AppUpdateResponse>
}
