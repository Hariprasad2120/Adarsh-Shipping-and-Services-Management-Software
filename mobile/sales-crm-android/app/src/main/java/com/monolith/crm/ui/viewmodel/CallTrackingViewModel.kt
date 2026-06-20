package com.monolith.crm.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.documentfile.provider.DocumentFile
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.work.*
import com.monolith.crm.data.local.PendingUpload
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.worker.UploadWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.security.MessageDigest
import android.media.MediaMetadataRetriever
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull

class CallTrackingViewModel(private val repository: CrmRepository) : ViewModel() {

    var activeCall by mutableStateOf<CrmRepository.ActiveCall?>(null)
    var scanResults by mutableStateOf<List<MatchedFile>>(emptyList())
    var isScanning by mutableStateOf(false)
    var uploadHistory by mutableStateOf<List<PendingUpload>>(emptyList())

    // Upload progress tracking
    var isUploading by mutableStateOf(false)
    var uploadProgress by mutableStateOf(0f) // 0.0 to 1.0
    var uploadError by mutableStateOf<String?>(null)
    var uploadSuccess by mutableStateOf(false)

    init {
        loadHistory()
        checkActiveCall()
    }

    fun checkActiveCall() {
        activeCall = repository.getActiveCallAttempt()
    }

    fun loadHistory() {
        viewModelScope.launch {
            uploadHistory = repository.dao.getAllUploads()
        }
    }

    fun completeCallAttempt(durationSeconds: Int, status: String, onDone: () -> Unit) {
        val call = activeCall ?: return
        viewModelScope.launch {
            repository.completeCallAttempt(call.attemptId, durationSeconds, status)
            onDone()
        }
    }

    fun scanCallRecordings(context: Context, onScanFinished: (List<MatchedFile>) -> Unit) {
        val call = activeCall ?: return
        val folderUriStr = repository.getSelectedFolderUri() ?: return
        val folderUri = Uri.parse(folderUriStr)

        isScanning = true
        scanResults = emptyList()

        viewModelScope.launch(Dispatchers.IO) {
            val matchedList = mutableListOf<MatchedFile>()
            val callDurationEst = (System.currentTimeMillis() - call.startTime) / 1000

            try {
                val directory = DocumentFile.fromTreeUri(context, folderUri)
                if (directory != null && directory.isDirectory) {
                    val files = directory.listFiles()
                    val audioExtensions = listOf("m4a", "mp3", "aac", "amr", "wav", "3gp")

                    for (file in files) {
                        val name = file.name ?: continue
                        val ext = name.substringAfterLast('.', "").lowercase()
                        if (ext !in audioExtensions) continue

                        val fileLastModified = file.lastModified()
                        val fileSize = file.length()
                        
                        if (fileLastModified < call.startTime) continue

                        val hash = calculateSHA256(context, file.uri)
                        val isDuplicate = repository.dao.getByHash(hash) != null
                        val fileDuration = getAudioDuration(context, file.uri)

                        // Scoring criteria
                        var score = 0
                        val reasonList = mutableListOf<String>()

                        // 1. Timestamp match (40 pts)
                        val timeDiff = Math.abs(fileLastModified - call.startTime)
                        if (timeDiff < 10 * 60 * 1000) {
                            score += 40
                            reasonList.add("Timestamp matched (+40 pts)")
                        }

                        // 2. Duration match (25 pts)
                        if (fileDuration > 0) {
                            val durationDiff = Math.abs(fileDuration - callDurationEst)
                            if (durationDiff <= 15) {
                                score += 25
                                reasonList.add("Duration matched (+25 pts)")
                            } else if (durationDiff <= 60) {
                                score += 12
                                reasonList.add("Duration close (+12 pts)")
                            }
                        }

                        // 3. Filename/Phone match (20 pts)
                        if (call.phone.length >= 4) {
                            val last4 = call.phone.takeLast(4)
                            if (name.contains(call.phone) || name.contains(last4)) {
                                score += 20
                                reasonList.add("Filename phone match (+20 pts)")
                            }
                        }

                        // 4. Valid size (10 pts)
                        if (fileSize > 1024) {
                            score += 10
                            reasonList.add("File size valid (+10 pts)")
                        }

                        // 5. Unique check (20 pts)
                        if (!isDuplicate) {
                            score += 20
                            reasonList.add("Unique file check (+20 pts)")
                        }

                        if (score >= 30) {
                            matchedList.add(
                                MatchedFile(
                                    fileName = name,
                                    fileUri = file.uri.toString(),
                                    fileSize = fileSize,
                                    durationSeconds = fileDuration,
                                    recordedAt = fileLastModified,
                                    sha256Hash = hash,
                                    matchConfidence = score.toFloat(),
                                    matchReason = reasonList.joinToString(", "),
                                    isDuplicate = isDuplicate
                                )
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            val sortedMatches = matchedList.sortedByDescending { it.matchConfidence }

            withContext(Dispatchers.Main) {
                scanResults = sortedMatches
                isScanning = false
                onScanFinished(sortedMatches)
            }
        }
    }

    fun queueUpload(context: Context, matched: MatchedFile, onDone: () -> Unit) {
        val call = activeCall ?: return
        viewModelScope.launch(Dispatchers.IO) {
            val pendingUpload = PendingUpload(
                callAttemptId = call.attemptId,
                leadId = call.leadId,
                customerPhone = call.phone,
                fileName = matched.fileName,
                fileUri = matched.fileUri,
                fileSize = matched.fileSize,
                durationSeconds = matched.durationSeconds,
                recordedAt = matched.recordedAt,
                sha256Hash = matched.sha256Hash,
                matchConfidence = matched.matchConfidence,
                matchReason = matched.matchReason
            )
            repository.dao.insert(pendingUpload)

            triggerBackgroundUploader(context)
            repository.clearActiveCallAttempt()

            withContext(Dispatchers.Main) {
                activeCall = null
                loadHistory()
                onDone()
            }
        }
    }

    /**
     * Upload with real-time progress tracking (inline, not WorkManager).
     * Shows progress in the UI and logs all steps to the debug menu.
     */
    fun uploadWithProgress(context: Context, matched: MatchedFile, onComplete: (Boolean) -> Unit) {
        val call = activeCall ?: return
        isUploading = true
        uploadProgress = 0f
        uploadError = null
        uploadSuccess = false

        com.monolith.crm.ui.components.AppLogger.info("Upload", "Starting upload: ${matched.fileName}", "Size: ${matched.fileSize / 1024}KB, Attempt: ${call.attemptId}")

        viewModelScope.launch(Dispatchers.IO) {
            try {
                withContext(Dispatchers.Main) { uploadProgress = 0.05f }
                
                // Notify server we are starting the upload
                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "UPLOADING",
                    uploadProgress = 5,
                    fileName = matched.fileName,
                    fileSize = matched.fileSize,
                    sha256Hash = matched.sha256Hash
                )

                com.monolith.crm.ui.components.AppLogger.info("Upload", "Reading file bytes...", matched.fileUri)

                // Read file bytes
                val fileUri = Uri.parse(matched.fileUri)
                val inputStream = context.contentResolver.openInputStream(fileUri)
                    ?: throw java.io.IOException("Cannot open file: ${matched.fileUri}")
                val fileBytes = inputStream.readBytes()
                inputStream.close()

                withContext(Dispatchers.Main) { uploadProgress = 0.2f }
                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "UPLOADING",
                    uploadProgress = 20
                )
                com.monolith.crm.ui.components.AppLogger.info("Upload", "File read complete", "${fileBytes.size} bytes")

                // Determine MIME type
                val mimeType = when {
                    matched.fileName.endsWith(".m4a", true) -> "audio/mp4"
                    matched.fileName.endsWith(".mp3", true) -> "audio/mpeg"
                    matched.fileName.endsWith(".wav", true) -> "audio/wav"
                    matched.fileName.endsWith(".aac", true) -> "audio/aac"
                    matched.fileName.endsWith(".amr", true) -> "audio/amr"
                    matched.fileName.endsWith(".3gp", true) -> "audio/3gpp"
                    else -> "audio/octet-stream"
                }

                // Build multipart
                val mediaType = mimeType.toMediaTypeOrNull()
                val fileRequestBody = fileBytes.toRequestBody(mediaType)
                val filePart = okhttp3.MultipartBody.Part.createFormData("file", matched.fileName, fileRequestBody)

                withContext(Dispatchers.Main) { uploadProgress = 0.35f }
                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "UPLOADING",
                    uploadProgress = 35
                )
                com.monolith.crm.ui.components.AppLogger.info("Upload", "Uploading to server...", "MIME: $mimeType")

                // Upload
                val result = repository.uploadRecording(
                    attemptId = call.attemptId,
                    filePart = filePart,
                    fileName = matched.fileName,
                    mimeType = mimeType,
                    fileSize = matched.fileSize,
                    durationSeconds = matched.durationSeconds,
                    recordedAt = matched.recordedAt,
                    sha256Hash = matched.sha256Hash,
                    matchConfidence = matched.matchConfidence,
                    matchReason = matched.matchReason
                )

                withContext(Dispatchers.Main) { uploadProgress = 0.9f }
                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "UPLOADING",
                    uploadProgress = 90
                )

                if (result.isSuccess) {
                    val response = result.getOrNull()
                    val isDuplicate = response?.duplicate == true
                    com.monolith.crm.ui.components.AppLogger.info(
                        "Upload", 
                        if (isDuplicate) "Recording already exists (duplicate hash)" else "Upload successful!",
                        "Recording ID: ${response?.recording?.id ?: "N/A"}"
                    )

                    // Also save to local DB for history
                    val pendingUpload = PendingUpload(
                        callAttemptId = call.attemptId,
                        leadId = call.leadId,
                        customerPhone = call.phone,
                        fileName = matched.fileName,
                        fileUri = matched.fileUri,
                        fileSize = matched.fileSize,
                        durationSeconds = matched.durationSeconds,
                        recordedAt = matched.recordedAt,
                        sha256Hash = matched.sha256Hash,
                        matchConfidence = matched.matchConfidence,
                        matchReason = matched.matchReason,
                        uploadStatus = "UPLOADED"
                    )
                    repository.dao.insert(pendingUpload)

                    // Notify server upload is complete
                    repository.updateRecordingStatus(
                        attemptId = call.attemptId,
                        uploadStatus = "UPLOADED",
                        uploadProgress = 100
                    )

                    withContext(Dispatchers.Main) {
                        uploadProgress = 1f
                        uploadSuccess = true
                        isUploading = false
                        loadHistory()
                        onComplete(true)
                    }
                } else {
                    val errorMsg = result.exceptionOrNull()?.message ?: "Unknown error"
                    com.monolith.crm.ui.components.AppLogger.error("Upload", "Upload failed", errorMsg)

                    // Queue for retry via WorkManager
                    val pendingUpload = PendingUpload(
                        callAttemptId = call.attemptId,
                        leadId = call.leadId,
                        customerPhone = call.phone,
                        fileName = matched.fileName,
                        fileUri = matched.fileUri,
                        fileSize = matched.fileSize,
                        durationSeconds = matched.durationSeconds,
                        recordedAt = matched.recordedAt,
                        sha256Hash = matched.sha256Hash,
                        matchConfidence = matched.matchConfidence,
                        matchReason = matched.matchReason,
                        uploadStatus = "FAILED",
                        errorMessage = errorMsg
                    )
                    repository.dao.insert(pendingUpload)
                    triggerBackgroundUploader(context)

                    repository.updateRecordingStatus(
                        attemptId = call.attemptId,
                        uploadStatus = "FAILED",
                        errorMessage = errorMsg
                    )

                    withContext(Dispatchers.Main) {
                        uploadError = errorMsg
                        isUploading = false
                        loadHistory()
                        onComplete(false)
                    }
                }
            } catch (e: Exception) {
                com.monolith.crm.ui.components.AppLogger.error("Upload", "Upload exception", e.message ?: "Unknown")

                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "FAILED",
                    errorMessage = e.message ?: "Upload failed"
                )

                withContext(Dispatchers.Main) {
                    uploadError = e.message ?: "Upload failed"
                    isUploading = false
                    onComplete(false)
                }
            }
        }
    }

    fun skipUpload(onDone: () -> Unit) {
        val call = activeCall
        if (call != null) {
            viewModelScope.launch(Dispatchers.IO) {
                repository.updateRecordingStatus(
                    attemptId = call.attemptId,
                    uploadStatus = "CANCELLED",
                    errorMessage = "Cancelled by user"
                )
            }
        }
        repository.clearActiveCallAttempt()
        activeCall = null
        onDone()
    }

    /**
     * Read real file metadata from a manually selected URI and create a MatchedFile.
     */
    fun prepareManualUpload(context: Context, uri: Uri, onReady: (MatchedFile?) -> Unit) {
        com.monolith.crm.ui.components.AppLogger.info("Upload", "Preparing manual file", uri.toString())
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Get file name
                var fileName = "recording_${System.currentTimeMillis()}.mp3"
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        val nameIdx = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (nameIdx >= 0) fileName = it.getString(nameIdx)
                    }
                }

                // Read bytes and compute SHA-256
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw java.io.IOException("Cannot open file")
                val bytes = inputStream.readBytes()
                inputStream.close()

                val digest = MessageDigest.getInstance("SHA-256")
                val hashBytes = digest.digest(bytes)
                val sha256 = hashBytes.joinToString("") { "%02x".format(it) }

                // Get duration
                var durationSeconds = 0f
                try {
                    val retriever = MediaMetadataRetriever()
                    retriever.setDataSource(context, uri)
                    val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
                    durationSeconds = durationMs / 1000f
                    retriever.release()
                } catch (_: Exception) {}

                val matched = MatchedFile(
                    fileName = fileName,
                    fileUri = uri.toString(),
                    fileSize = bytes.size.toLong(),
                    durationSeconds = durationSeconds,
                    recordedAt = System.currentTimeMillis(),
                    sha256Hash = sha256,
                    matchConfidence = 100f,
                    matchReason = "User manual selection",
                    isDuplicate = false
                )

                com.monolith.crm.ui.components.AppLogger.info("Upload", "File ready: $fileName", "Size: ${bytes.size / 1024}KB, Hash: ${sha256.take(8)}..., Duration: ${durationSeconds}s")

                withContext(Dispatchers.Main) {
                    onReady(matched)
                }
            } catch (e: Exception) {
                com.monolith.crm.ui.components.AppLogger.error("Upload", "Failed to prepare file", e.message ?: "Unknown")
                withContext(Dispatchers.Main) {
                    onReady(null)
                }
            }
        }
    }

    fun clearActiveCall() {
        repository.clearActiveCallAttempt()
        activeCall = null
    }

    fun completeCallAttempt(attemptId: String, duration: Int, status: String) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val result = repository.completeCallAttempt(attemptId, duration, status)
                if (result.isSuccess) {
                    com.monolith.crm.ui.components.AppLogger.info("CallTrack", "Call attempt $attemptId completed as $status")
                } else {
                    com.monolith.crm.ui.components.AppLogger.error("CallTrack", "Failed to complete call attempt: ${result.exceptionOrNull()?.message}")
                }
            } catch (e: Exception) {
                com.monolith.crm.ui.components.AppLogger.error("CallTrack", "Error completing call attempt: ${e.message}")
            }
        }
    }

    fun triggerBackgroundUploader(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val uploadRequest = OneTimeWorkRequestBuilder<UploadWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                java.util.concurrent.TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            "CrmCallRecordingUploader",
            ExistingWorkPolicy.REPLACE,
            uploadRequest
        )
    }

    private fun calculateSHA256(context: Context, uri: Uri): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            if (inputStream == null) return "error_${System.currentTimeMillis()}"
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
            inputStream.close()
            val hashBytes = digest.digest()
            hashBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            "error_${System.currentTimeMillis()}"
        }
    }

    private fun getAudioDuration(context: Context, uri: Uri): Float {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, uri)
            val timeStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
            timeStr?.toFloat()?.div(1000f) ?: 0.0f
        } catch (e: Exception) {
            0.0f
        } finally {
            try {
                retriever.release()
            } catch (ex: Exception) {
                // Ignore release errors
            }
        }
    }

    data class MatchedFile(
        val fileName: String,
        val fileUri: String,
        val fileSize: Long,
        val durationSeconds: Float,
        val recordedAt: Long,
        val sha256Hash: String,
        val matchConfidence: Float,
        val matchReason: String,
        val isDuplicate: Boolean
    )
}

class CallTrackingViewModelFactory(private val repository: CrmRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CallTrackingViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return CallTrackingViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
