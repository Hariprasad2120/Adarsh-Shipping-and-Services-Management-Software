package com.monolith.crm.hrms.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.monolith.crm.hrms.data.remote.OnDutyRequestData
import com.monolith.crm.hrms.data.repository.HrmsRepository
import com.monolith.crm.hrms.service.LocationHelper
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.launch

/**
 * ViewModel for on-duty trip management and fuel reimbursement.
 */
class OnDutyViewModel(
    private val repository: HrmsRepository,
    private val context: Context
) : ViewModel() {

    var requests by mutableStateOf<List<OnDutyRequestData>>(emptyList())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)
    var isSubmitting by mutableStateOf(false)

    // Active trip state
    var activeTripId by mutableStateOf<String?>(null)
    var isTracking by mutableStateOf(false)

    fun loadRequests() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = repository.getOnDutyRequests()
            isLoading = false
            if (result.isSuccess) {
                requests = result.getOrNull() ?: emptyList()
                // Check if any trip is active
                val active = requests.find { it.status == "IN_PROGRESS" }
                activeTripId = active?.id
                isTracking = active != null
            } else {
                errorMessage = result.exceptionOrNull()?.message
            }
        }
    }

    fun createRequest(
        purpose: String,
        visitLocation: String?,
        visitAddress: String?,
        fromDate: String,
        toDate: String
    ) {
        isSubmitting = true
        errorMessage = null
        viewModelScope.launch {
            val result = repository.createOnDutyRequest(
                purpose = purpose,
                visitLocation = visitLocation,
                visitAddress = visitAddress,
                fromDate = fromDate,
                toDate = toDate
            )
            isSubmitting = false
            if (result.isSuccess) {
                successMessage = "On-duty request submitted for approval"
                loadRequests()
            } else {
                errorMessage = result.exceptionOrNull()?.message ?: "Failed to create request"
            }
        }
    }

    fun startTrip(requestId: String) {
        isSubmitting = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val location = LocationHelper.getCurrentLocation(context)
                if (location == null) {
                    errorMessage = "Could not get GPS location"
                    isSubmitting = false
                    return@launch
                }

                val result = repository.startOnDutyTrip(
                    requestId = requestId,
                    latitude = location.latitude,
                    longitude = location.longitude
                )
                isSubmitting = false
                if (result.isSuccess) {
                    activeTripId = requestId
                    isTracking = true
                    successMessage = "Trip started. Tracking your route."
                    // Start on-duty tracking (5-min intervals)
                    LocationHelper.startOnDutyTracking(context)
                    loadRequests()
                } else {
                    errorMessage = result.exceptionOrNull()?.message ?: "Failed to start trip"
                }
            } catch (e: Exception) {
                isSubmitting = false
                errorMessage = e.message
            }
        }
    }

    fun completeTrip(requestId: String) {
        isSubmitting = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val location = LocationHelper.getCurrentLocation(context)
                if (location == null) {
                    errorMessage = "Could not get GPS location"
                    isSubmitting = false
                    return@launch
                }

                val result = repository.completeOnDutyTrip(
                    requestId = requestId,
                    latitude = location.latitude,
                    longitude = location.longitude
                )
                isSubmitting = false
                if (result.isSuccess) {
                    activeTripId = null
                    isTracking = false
                    successMessage = "Trip completed. Distance tracked and reimbursement claim generated."
                    // Stop on-duty tracking, switch back to working hours if still checked in
                    LocationHelper.stopTracking(context)
                    loadRequests()
                } else {
                    errorMessage = result.exceptionOrNull()?.message ?: "Failed to complete trip"
                }
            } catch (e: Exception) {
                isSubmitting = false
                errorMessage = e.message
            }
        }
    }

    fun clearMessages() {
        errorMessage = null
        successMessage = null
    }
}

class OnDutyViewModelFactory(
    private val repository: HrmsRepository,
    private val context: Context
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(OnDutyViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return OnDutyViewModel(repository, context) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
