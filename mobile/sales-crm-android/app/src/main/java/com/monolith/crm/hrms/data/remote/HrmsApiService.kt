package com.monolith.crm.hrms.data.remote

import retrofit2.Response
import retrofit2.http.*

// HRMS Mobile API service - all endpoints under /api/mobile/hrms/
interface HrmsApiService {

    // -- Dashboard --
    @GET("api/mobile/hrms/dashboard")
    suspend fun getDashboard(
        @Header("Authorization") token: String
    ): Response<HrmsDashboardResponse>

    // -- Attendance --
    @POST("api/mobile/hrms/attendance/check-in")
    suspend fun checkIn(
        @Header("Authorization") token: String,
        @Body request: CheckInRequest
    ): Response<CheckInResponse>

    @POST("api/mobile/hrms/attendance/check-out")
    suspend fun checkOut(
        @Header("Authorization") token: String,
        @Body request: CheckOutRequest
    ): Response<CheckOutResponse>

    @GET("api/mobile/hrms/attendance/history")
    suspend fun getAttendanceHistory(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): Response<AttendanceHistoryResponse>

    // -- Face Enrollment --
    @GET("api/mobile/hrms/face/enroll")
    suspend fun getFaceEnrollmentStatus(
        @Header("Authorization") token: String
    ): Response<FaceEnrollmentStatusResponse>

    @POST("api/mobile/hrms/face/enroll")
    suspend fun enrollFace(
        @Header("Authorization") token: String,
        @Body request: FaceEnrollRequest
    ): Response<FaceEnrollResponse>

    // -- Location Tracking --
    @GET("api/mobile/hrms/tracking/heartbeat")
    suspend fun getTrackingStatus(
        @Header("Authorization") token: String
    ): Response<TrackingStatusResponse>

    @POST("api/mobile/hrms/tracking/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") token: String,
        @Body request: TrackingHeartbeatRequest
    ): Response<TrackingHeartbeatResponse>

    // -- On-Duty --
    @GET("api/mobile/hrms/on-duty")
    suspend fun getOnDutyRequests(
        @Header("Authorization") token: String
    ): Response<OnDutyListResponse>

    @POST("api/mobile/hrms/on-duty")
    suspend fun onDutyAction(
        @Header("Authorization") token: String,
        @Body request: OnDutyActionRequest
    ): Response<OnDutyActionResponse>

    // -- Agreement --
    @GET("api/mobile/hrms/agreement")
    suspend fun getAgreement(
        @Header("Authorization") token: String
    ): Response<AgreementResponse>

    @POST("api/mobile/hrms/agreement")
    suspend fun acceptAgreement(
        @Header("Authorization") token: String,
        @Body request: AgreementAcceptRequest
    ): Response<AgreementAcceptResponse>
}
