package com.monolith.crm.hrms.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.monolith.crm.hrms.data.remote.*
import com.monolith.crm.hrms.data.repository.HrmsRepository
import com.monolith.crm.hrms.service.LocationHelper
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.launch

/**
 * ViewModel for the HRMS Dashboard and attendance operations.
 */
class HrmsViewModel(
    private val repository: HrmsRepository,
    private val context: Context
) : ViewModel() {

    // -- Dashboard state --
    var dashboardData by mutableStateOf<HrmsDashboardData?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    // -- Attendance state --
    var isCheckedIn by mutableStateOf(false)
    var currentSessionId by mutableStateOf<String?>(null)
    var checkInTime by mutableStateOf<String?>(null)
    var workingMinutes by mutableStateOf(0)

    // -- Face enrollment state --
    var faceEnrolled by mutableStateOf(false)
    var agreementAccepted by mutableStateOf(false)

    // -- Operation states --
    var isCheckingIn by mutableStateOf(false)
    var isCheckingOut by mutableStateOf(false)
    var checkInResult by mutableStateOf<String?>(null)
    var checkOutResult by mutableStateOf<String?>(null)

    // -- History --
    var attendanceHistory by mutableStateOf<List<AttendanceSession>>(emptyList())
    var historyLoading by mutableStateOf(false)

    fun loadDashboard() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = repository.getDashboard()
            isLoading = false
            if (result.isSuccess) {
                val data = result.getOrNull()!!
                dashboardData = data
                isCheckedIn = data.attendance.isCheckedIn
                currentSessionId = data.attendance.sessionId
                checkInTime = data.attendance.checkInTime
                workingMinutes = data.attendance.workingMinutes ?: 0
                faceEnrolled = data.faceEnrolled
                agreementAccepted = data.agreementAccepted
                AppLogger.info("HRMS", "Dashboard loaded: checkedIn=$isCheckedIn, faceEnrolled=$faceEnrolled")
            } else {
                errorMessage = result.exceptionOrNull()?.message ?: "Failed to load dashboard"
                AppLogger.error("HRMS", "Dashboard load failed: $errorMessage")
            }
        }
    }

    fun performCheckIn(faceDescriptor: List<Float>?, faceConfidence: Float?) {
        isCheckingIn = true
        checkInResult = null
        errorMessage = null
        viewModelScope.launch {
            try {
                // Get current GPS location
                val location = LocationHelper.getCurrentLocation(context)
                if (location == null) {
                    errorMessage = "Could not get GPS location. Please enable location services."
                    isCheckingIn = false
                    return@launch
                }

                val result = repository.checkIn(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy,
                    faceDescriptor = faceDescriptor,
                    faceConfidence = faceConfidence
                )

                isCheckingIn = false
                if (result.isSuccess) {
                    val data = result.getOrNull()!!
                    isCheckedIn = true
                    currentSessionId = data.sessionId
                    checkInTime = data.checkInTime
                    checkInResult = "Checked in successfully at ${data.checkInTime}"

                    // Start working hours location tracking
                    LocationHelper.startWorkingHoursTracking(context)
                    AppLogger.info("HRMS", "Check-in successful, tracking started")
                } else {
                    errorMessage = result.exceptionOrNull()?.message ?: "Check-in failed"
                }
            } catch (e: Exception) {
                isCheckingIn = false
                errorMessage = e.message ?: "Check-in failed"
                AppLogger.error("HRMS", "Check-in error: ${e.message}", e)
            }
        }
    }

    fun performCheckOut(faceDescriptor: List<Float>?, faceConfidence: Float?) {
        isCheckingOut = true
        checkOutResult = null
        errorMessage = null
        viewModelScope.launch {
            try {
                val location = LocationHelper.getCurrentLocation(context)
                if (location == null) {
                    errorMessage = "Could not get GPS location. Please enable location services."
                    isCheckingOut = false
                    return@launch
                }

                val result = repository.checkOut(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy,
                    faceDescriptor = faceDescriptor,
                    faceConfidence = faceConfidence,
                    sessionId = currentSessionId
                )

                isCheckingOut = false
                if (result.isSuccess) {
                    val data = result.getOrNull()!!
                    isCheckedIn = false
                    currentSessionId = null
                    workingMinutes = data.workingMinutes
                    checkOutResult = "Checked out. Total: ${data.totalHours}"

                    // Stop location tracking
                    LocationHelper.stopTracking(context)
                    AppLogger.info("HRMS", "Check-out successful, tracking stopped. Hours: ${data.totalHours}")
                } else {
                    errorMessage = result.exceptionOrNull()?.message ?: "Check-out failed"
                }
            } catch (e: Exception) {
                isCheckingOut = false
                errorMessage = e.message ?: "Check-out failed"
                AppLogger.error("HRMS", "Check-out error: ${e.message}", e)
            }
        }
    }

    fun loadAttendanceHistory(page: Int = 1) {
        historyLoading = true
        viewModelScope.launch {
            val result = repository.getAttendanceHistory(page)
            historyLoading = false
            if (result.isSuccess) {
                attendanceHistory = result.getOrNull()?.sessions ?: emptyList()
            }
        }
    }

    fun clearMessages() {
        errorMessage = null
        checkInResult = null
        checkOutResult = null
    }
}

class HrmsViewModelFactory(
    private val repository: HrmsRepository,
    private val context: Context
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(HrmsViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return HrmsViewModel(repository, context) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
