package com.monolith.crm.data.repository

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.GsonBuilder
import com.monolith.crm.data.local.AppDatabase
import com.monolith.crm.data.local.PendingUpload
import com.monolith.crm.data.remote.CallAttemptRequest
import com.monolith.crm.data.remote.CompleteAttemptRequest
import com.monolith.crm.data.remote.CrmApiService
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.data.remote.LoginRequest
import com.monolith.crm.data.remote.LoginResponse
import com.monolith.crm.data.remote.UploadRecordingResponse
import com.monolith.crm.data.remote.RecordingStatusRequest
import com.monolith.crm.data.remote.RecordingStatusResponse
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class CrmRepository(private val context: Context) {

    private val db = AppDatabase.getDatabase(context)
    val dao = db.pendingUploadDao()

    private var sharedPreferences: SharedPreferences

    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        sharedPreferences = EncryptedSharedPreferences.create(
            context,
            "crm_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // Track the URL the current apiService was built with
    private var _currentApiUrl: String? = null
    private var _apiService: CrmApiService? = null

    private fun getApiService(): CrmApiService {
        val url = getBaseUrl()
        // Recreate if URL changed or not yet created
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
                .create(CrmApiService::class.java)
            _currentApiUrl = url
        }
        return _apiService!!
    }

    fun getBaseUrl(): String {
        return sharedPreferences.getString("base_url", "http://10.0.2.2:3000/") ?: "http://10.0.2.2:3000/"
    }

    fun setBaseUrl(url: String) {
        sharedPreferences.edit().putString("base_url", url).apply()
        // Force recreation of apiService on next call
        _apiService = null
        _currentApiUrl = null
    }

    fun getAuthToken(): String? {
        val token = sharedPreferences.getString("auth_token", null)
        return token?.let { "Bearer $it" }
    }

    fun setAuthToken(token: String?) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }

    fun setUserId(id: String?) {
        sharedPreferences.edit().putString("user_id", id).apply()
    }

    fun getUserId(): String? = sharedPreferences.getString("user_id", null)

    fun setUserName(name: String?) {
        sharedPreferences.edit().putString("user_name", name).apply()
    }

    fun getUserName(): String? = sharedPreferences.getString("user_name", "Representative")

    fun setUserEmail(email: String?) {
        sharedPreferences.edit().putString("user_email", email).apply()
    }

    fun getUserEmail(): String? = sharedPreferences.getString("user_email", "")

    fun setSelectedFolderUri(uri: String?) {
        sharedPreferences.edit().putString("selected_folder_uri", uri).apply()
    }

    fun getSelectedFolderUri(): String? = sharedPreferences.getString("selected_folder_uri", null)

    fun hasConsent(): Boolean = sharedPreferences.getBoolean("user_consent", false)

    fun setConsent(consented: Boolean) {
        sharedPreferences.edit().putBoolean("user_consent", consented).apply()
    }

    fun isMockCallMode(): Boolean = sharedPreferences.getBoolean("mock_call_mode", false)

    fun setMockCallMode(enabled: Boolean) {
        sharedPreferences.edit().putBoolean("mock_call_mode", enabled).apply()
    }

    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = getApiService().login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                setAuthToken(body.token)
                setUserId(body.user.id)
                setUserName(body.user.name)
                setUserEmail(body.user.email)
                Result.success(body)
            } else {
                val errorBody = response.errorBody()?.string()
                val msg = try {
                    // Try to extract JSON error message
                    val json = com.google.gson.JsonParser.parseString(errorBody ?: "").asJsonObject
                    json.get("error")?.asString ?: "Login failed (HTTP ${response.code()})"
                } catch (_: Exception) {
                    errorBody?.take(200) ?: "Login failed (HTTP ${response.code()})"
                }
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAssignedLeads(): Result<List<LeadMetadata>> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = getApiService().getAssignedLeads(token)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.leads)
            } else {
                Result.failure(Exception("Failed to load leads"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startCallAttempt(leadId: String, phone: String): Result<String> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = getApiService().startCallAttempt(token, leadId, CallAttemptRequest(phone))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.callAttemptId)
            } else {
                Result.failure(Exception("Failed to log call attempt on backend"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeCallAttempt(attemptId: String, duration: Int, status: String): Result<Boolean> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = getApiService().completeCallAttempt(token, attemptId, CompleteAttemptRequest(duration, status))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                Result.failure(Exception("Failed to complete call attempt on backend"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadRecording(
        attemptId: String,
        filePart: MultipartBody.Part,
        fileName: String,
        mimeType: String,
        fileSize: Long,
        durationSeconds: Float,
        recordedAt: Long,
        sha256Hash: String,
        matchConfidence: Float,
        matchReason: String
    ): Result<UploadRecordingResponse> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        
        val fileNameBody = fileName.toRequestBody("text/plain".toMediaTypeOrNull())
        val mimeTypeBody = mimeType.toRequestBody("text/plain".toMediaTypeOrNull())
        val fileSizeBody = fileSize.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val durationBody = durationSeconds.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val recordedAtBody = recordedAt.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val sha256Body = sha256Hash.toRequestBody("text/plain".toMediaTypeOrNull())
        val confidenceBody = matchConfidence.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val reasonBody = matchReason.toRequestBody("text/plain".toMediaTypeOrNull())

        return try {
            val response = getApiService().uploadRecording(
                token,
                attemptId,
                filePart,
                fileNameBody,
                mimeTypeBody,
                fileSizeBody,
                durationBody,
                recordedAtBody,
                sha256Body,
                confidenceBody,
                reasonBody
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Upload failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateRecordingStatus(
        attemptId: String,
        uploadStatus: String,
        uploadProgress: Int? = null,
        errorMessage: String? = null,
        fileName: String? = null,
        fileSize: Long? = null,
        sha256Hash: String? = null
    ): Result<Boolean> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        val request = RecordingStatusRequest(
            uploadStatus = uploadStatus,
            uploadProgress = uploadProgress,
            errorMessage = errorMessage,
            fileName = fileName,
            fileSize = fileSize,
            sha256Hash = sha256Hash
        )
        return try {
            val response = getApiService().updateRecordingStatus(token, attemptId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Failed to update recording status"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        setAuthToken(null)
        setUserId(null)
        setUserName(null)
        setUserEmail(null)
    }

    suspend fun updateLeadStatus(
        leadId: String,
        status: String,
        reason: String? = null,
        enquiryDetails: Map<String, Any?>? = null
    ): Result<Boolean> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val request = com.monolith.crm.data.remote.UpdateLeadStatusRequest(
                status = status,
                reason = reason,
                enquiryDetails = enquiryDetails
            )
            val response = getApiService().updateLeadStatus(token, leadId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception(errorBody?.take(200) ?: "Failed to update lead status"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun saveActiveCallAttempt(attemptId: String, leadId: String, phone: String, startTime: Long) {
        sharedPreferences.edit()
            .putString("active_call_attempt_id", attemptId)
            .putString("active_call_lead_id", leadId)
            .putString("active_call_phone", phone)
            .putLong("active_call_start_time", startTime)
            .apply()
    }

    fun getActiveCallAttempt(): ActiveCall? {
        val id = sharedPreferences.getString("active_call_attempt_id", null) ?: return null
        val leadId = sharedPreferences.getString("active_call_lead_id", "") ?: ""
        val phone = sharedPreferences.getString("active_call_phone", "") ?: ""
        val startTime = sharedPreferences.getLong("active_call_start_time", 0)
        return ActiveCall(id, leadId, phone, startTime)
    }

    fun clearActiveCallAttempt() {
        sharedPreferences.edit()
            .remove("active_call_attempt_id")
            .remove("active_call_lead_id")
            .remove("active_call_phone")
            .remove("active_call_start_time")
            .apply()
    }

    suspend fun chatWithMona(message: String, sessionId: String? = null, action: String? = null): Result<com.monolith.crm.data.remote.MonaChatResponse> {
        val token = getAuthToken() ?: return Result.failure(Exception("Not authenticated"))
        return try {
            val response = getApiService().chatWithMona(
                token,
                com.monolith.crm.data.remote.MonaChatRequest(message = message, sessionId = sessionId, action = action)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception(errorBody?.take(200) ?: "Failed to chat with Mona"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    data class ActiveCall(val attemptId: String, val leadId: String, val phone: String, val startTime: Long)
}
