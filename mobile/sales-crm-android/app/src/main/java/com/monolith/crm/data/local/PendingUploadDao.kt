package com.monolith.crm.data.local

import androidx.room.*

@Dao
interface PendingUploadDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(upload: PendingUpload): Long

    @Update
    suspend fun update(upload: PendingUpload)

    @Delete
    suspend fun delete(upload: PendingUpload)

    @Query("SELECT * FROM pending_uploads WHERE uploadStatus IN ('PENDING', 'FAILED')")
    suspend fun getAllPending(): List<PendingUpload>

    @Query("SELECT * FROM pending_uploads ORDER BY recordedAt DESC")
    suspend fun getAllUploads(): List<PendingUpload>

    @Query("SELECT * FROM pending_uploads WHERE id = :id")
    suspend fun getById(id: Int): PendingUpload?

    @Query("SELECT * FROM pending_uploads WHERE sha256Hash = :hash LIMIT 1")
    suspend fun getByHash(hash: String): PendingUpload?
}
