package com.monolith.crm.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_uploads")
data class PendingUpload(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val callAttemptId: String,
    val leadId: String,
    val customerPhone: String,
    val fileName: String,
    val fileUri: String,
    val fileSize: Long,
    val durationSeconds: Float,
    val recordedAt: Long,
    val sha256Hash: String,
    val matchConfidence: Float,
    val matchReason: String,
    var uploadStatus: String = "PENDING", // PENDING, UPLOADING, UPLOADED, FAILED
    var transcriptionStatus: String = "PENDING",
    var errorMessage: String? = null
)
