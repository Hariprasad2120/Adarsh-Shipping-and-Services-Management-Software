package com.monolith.crm.hrms.data.repository

import android.content.Context
import android.os.Build
import com.google.gson.GsonBuilder
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.hrms.data.remote.*
import com.monolith.crm.ui.components.AppLogger
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Repository for all HRMS mobile API interactions.
 * Reuses the auth token and base URL from the shared CrmRepository.
 */
class HrmsRepository(
    private val context: Context,
    private val crmRepository: CrmRepository
) {
    private var _currentApiUrl: String? = null
    private var _apiService: HrmsApiService? = null

    private fun getApiService(): HrmsApiService {
        val url = crmRepository.getBaseUrl()
        if (_apiService == null || _currentApiUrl != url) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .followRedirects(false)
                .followSslRedirects(false)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(120, TimeUnit.SECONDS)
                .build()

            val gson = GsonBuilder().setLenient().create()

            _apiService = Retrofit.Builder()
                .baseUrl(url)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()
                .create(HrmsApiService::class.java)
            _currentApiUrl = url
        }
        return _apiService!!
    }

    private fun getToken(): String {
        return crmRepository.getAuthToken()
            ?: throw IllegalStateException("Not authenticated")
    }

    fun getDeviceInfo(): DeviceInfo {
        val versionName = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "2.0"
        } catch (_: Exception) { "2.0" }

        return DeviceInfo(
            model = "${Build.MANUFACTURER} ${Build.MODEL}",
            os = "Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})",
            appVersion = versionName,
            isMockLocation = false
        )
    }

    // -- Dashboard --

    suspend fun getDashboard(): Result<HrmsDashboardData> {
        return try {
            val response = getApiService().getDashboard(getToken())
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to load dashboard"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Dashboard fetch failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -- Attendance --

    suspend fun checkIn(
        latitude: Double,
        longitude: Double,
        accuracy: Float?,
        faceDescriptor: List<Float>?,
        faceConfidence: Float?
    ): Result<CheckInData> {
        return try {
            val request = CheckInRequest(
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
                faceDescriptor = faceDescriptor,
                faceConfidence = faceConfidence,
                deviceInfo = getDeviceInfo()
            )
            val response = getApiService().checkIn(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorBody = response.body()?.error ?: response.errorBody()?.string() ?: "Check-in failed"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Check-in failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun checkOut(
        latitude: Double,
        longitude: Double,
        accuracy: Float?,
        faceDescriptor: List<Float>?,
        faceConfidence: Float?,
        sessionId: String?
    ): Result<CheckOutData> {
        return try {
            val request = CheckOutRequest(
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
                faceDescriptor = faceDescriptor,
                faceConfidence = faceConfidence,
                sessionId = sessionId
            )
            val response = getApiService().checkOut(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorBody = response.body()?.error ?: response.errorBody()?.string() ?: "Check-out failed"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Check-out failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun getAttendanceHistory(page: Int = 1): Result<AttendanceHistoryData> {
        return try {
            val response = getApiService().getAttendanceHistory(getToken(), page)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("Failed to load attendance history"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Attendance history failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -- Face Enrollment --

    suspend fun getFaceEnrollmentStatus(): Result<FaceEnrollmentStatus> {
        return try {
            val response = getApiService().getFaceEnrollmentStatus(getToken())
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("Failed to get face enrollment status"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Face enrollment status failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun enrollFace(
        descriptor: List<Float>,
        captureQuality: Float?
    ): Result<FaceEnrollResultData> {
        return try {
            val request = FaceEnrollRequest(
                descriptor = descriptor,
                captureQuality = captureQuality,
                deviceInfo = getDeviceInfo()
            )
            val response = getApiService().enrollFace(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorBody = response.body()?.error ?: response.errorBody()?.string() ?: "Face enrollment failed"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Face enrollment failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -- Tracking --

    suspend fun getTrackingStatus(): Result<TrackingStatusData> {
        return try {
            val response = getApiService().getTrackingStatus(getToken())
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("Failed to get tracking status"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Tracking status failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun sendHeartbeat(
        latitude: Double,
        longitude: Double,
        accuracy: Float?,
        altitude: Double?,
        speed: Float?,
        bearing: Float?,
        batteryLevel: Int?,
        isMockLocation: Boolean,
        sessionType: String?
    ): Result<HeartbeatResultData> {
        return try {
            val request = TrackingHeartbeatRequest(
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
                altitude = altitude,
                speed = speed,
                bearing = bearing,
                batteryLevel = batteryLevel,
                isMockLocation = isMockLocation,
                sessionType = sessionType
            )
            val response = getApiService().sendHeartbeat(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorBody = response.body()?.error ?: "Heartbeat failed"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Heartbeat failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    // -- On-Duty --

    suspend fun getOnDutyRequests(): Result<List<OnDutyRequestData>> {
        return try {
            val response = getApiService().getOnDutyRequests(getToken())
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data ?: emptyList())
            } else {
                Result.failure(Exception("Failed to load on-duty requests"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "On-duty requests failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun createOnDutyRequest(
        purpose: String,
        visitLocation: String?,
        visitAddress: String?,
        fromDate: String,
        toDate: String
    ): Result<OnDutyActionResult> {
        return try {
            val request = OnDutyActionRequest(
                action = "create",
                requestId = null,
                purpose = purpose,
                visitLocation = visitLocation,
                visitAddress = visitAddress,
                fromDate = fromDate,
                toDate = toDate,
                latitude = null, longitude = null, distanceKm = null, notes = null
            )
            val response = getApiService().onDutyAction(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorBody = response.body()?.error ?: "Failed to create on-duty request"
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Create on-duty failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun startOnDutyTrip(
        requestId: String,
        latitude: Double,
        longitude: Double
    ): Result<OnDutyActionResult> {
        return try {
            val request = OnDutyActionRequest(
                action = "start",
                requestId = requestId,
                purpose = null, visitLocation = null, visitAddress = null,
                fromDate = null, toDate = null,
                latitude = latitude, longitude = longitude,
                distanceKm = null, notes = null
            )
            val response = getApiService().onDutyAction(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to start trip"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeOnDutyTrip(
        requestId: String,
        latitude: Double,
        longitude: Double
    ): Result<OnDutyActionResult> {
        return try {
            val request = OnDutyActionRequest(
                action = "complete",
                requestId = requestId,
                purpose = null, visitLocation = null, visitAddress = null,
                fromDate = null, toDate = null,
                latitude = latitude, longitude = longitude,
                distanceKm = null, notes = null
            )
            val response = getApiService().onDutyAction(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to complete trip"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // -- Agreement --

    suspend fun getAgreement(): Result<AgreementData> {
        return try {
            val response = getApiService().getAgreement(getToken())
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("Failed to load agreement"))
            }
        } catch (e: Exception) {
            AppLogger.error("HRMS", "Agreement fetch failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun acceptAgreement(agreementId: String): Result<Boolean> {
        return try {
            val request = AgreementAcceptRequest(
                agreementId = agreementId,
                deviceInfo = getDeviceInfo()
            )
            val response = getApiService().acceptAgreement(getToken(), request)
            if (response.isSuccessful && response.body()?.ok == true) {
                Result.success(true)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to accept agreement"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
