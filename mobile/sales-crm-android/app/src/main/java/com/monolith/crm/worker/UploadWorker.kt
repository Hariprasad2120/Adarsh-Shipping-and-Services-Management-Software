package com.monolith.crm.worker

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.ui.components.AppLogger
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class UploadWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val repository = CrmRepository(appContext)
        val pending = repository.dao.getAllPending()

        if (pending.isEmpty()) {
            AppLogger.info("UploadWorker", "No pending uploads found")
            return Result.success()
        }

        AppLogger.info("UploadWorker", "Starting background upload", "${pending.size} pending files")
        var hasFailure = false

        for (upload in pending) {
            try {
                AppLogger.info("UploadWorker", "Uploading: ${upload.fileName}", "Attempt: ${upload.callAttemptId}")

                // Update local Room state to UPLOADING
                upload.uploadStatus = "UPLOADING"
                repository.dao.update(upload)

                // Update server upload status to UPLOADING
                repository.updateRecordingStatus(
                    attemptId = upload.callAttemptId,
                    uploadStatus = "UPLOADING",
                    uploadProgress = 10,
                    fileName = upload.fileName,
                    fileSize = upload.fileSize,
                    sha256Hash = upload.sha256Hash
                )

                val fileUri = Uri.parse(upload.fileUri)
                
                // Read bytes from SAF
                val inputStream = appContext.contentResolver.openInputStream(fileUri)
                    ?: throw IOException("Failed to open input stream for URI: ${upload.fileUri}")
                
                val fileBytes = inputStream.readBytes()
                inputStream.close()

                AppLogger.info("UploadWorker", "File read: ${fileBytes.size} bytes", upload.fileName)

                val mimeType = when {
                    upload.fileName.endsWith(".m4a", true) -> "audio/mp4"
                    upload.fileName.endsWith(".mp3", true) -> "audio/mpeg"
                    upload.fileName.endsWith(".wav", true) -> "audio/wav"
                    upload.fileName.endsWith(".aac", true) -> "audio/aac"
                    upload.fileName.endsWith(".amr", true) -> "audio/amr"
                    upload.fileName.endsWith(".3gp", true) -> "audio/3gpp"
                    else -> "audio/octet-stream"
                }
                
                val fileRequestBody = fileBytes.toRequestBody(mimeType.toMediaTypeOrNull())
                val filePart = MultipartBody.Part.createFormData("file", upload.fileName, fileRequestBody)

                // Execute upload
                val result = repository.uploadRecording(
                    attemptId = upload.callAttemptId,
                    filePart = filePart,
                    fileName = upload.fileName,
                    mimeType = mimeType,
                    fileSize = upload.fileSize,
                    durationSeconds = upload.durationSeconds,
                    recordedAt = upload.recordedAt,
                    sha256Hash = upload.sha256Hash,
                    matchConfidence = upload.matchConfidence,
                    matchReason = upload.matchReason
                )

                if (result.isSuccess) {
                    val response = result.getOrNull()
                    upload.uploadStatus = "UPLOADED"
                    upload.transcriptionStatus = response?.recording?.transcriptionStatus ?: "PENDING"
                    upload.errorMessage = null
                    repository.dao.update(upload)

                    repository.updateRecordingStatus(
                        attemptId = upload.callAttemptId,
                        uploadStatus = "UPLOADED",
                        uploadProgress = 100
                    )

                    AppLogger.info("UploadWorker", "Upload success: ${upload.fileName}", "Duplicate: ${response?.duplicate}")
                } else {
                    val error = result.exceptionOrNull()
                    val errorMsg = error?.message ?: "Unknown upload failure"
                    upload.uploadStatus = "FAILED"
                    upload.errorMessage = errorMsg
                    repository.dao.update(upload)
                    hasFailure = true

                    repository.updateRecordingStatus(
                        attemptId = upload.callAttemptId,
                        uploadStatus = "FAILED",
                        errorMessage = errorMsg
                    )

                    AppLogger.error("UploadWorker", "Upload failed: ${upload.fileName}", errorMsg)
                }
            } catch (e: Exception) {
                val errorMsg = e.message ?: "Failed to process audio file bytes"
                upload.uploadStatus = "FAILED"
                upload.errorMessage = errorMsg
                repository.dao.update(upload)
                hasFailure = true

                repository.updateRecordingStatus(
                    attemptId = upload.callAttemptId,
                    uploadStatus = "FAILED",
                    errorMessage = errorMsg
                )

                AppLogger.error("UploadWorker", "Worker exception: ${upload.fileName}", errorMsg)
            }
        }

        AppLogger.info("UploadWorker", "Background upload complete", if (hasFailure) "Some failed — will retry" else "All successful")
        return if (hasFailure) Result.retry() else Result.success()
    }
}
