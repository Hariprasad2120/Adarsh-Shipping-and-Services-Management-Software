package com.monolith.crm.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LeadsViewModel(private val repository: CrmRepository) : ViewModel() {

    var allLeads by mutableStateOf<List<LeadMetadata>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var selectedLead by mutableStateOf<LeadMetadata?>(null)
    var currentTab by mutableStateOf("unopened")

    // Auto-refresh
    private var autoRefreshJob: Job? = null
    var lastRefreshTime by mutableStateOf(System.currentTimeMillis())
        private set

    // Categorized lead lists — matching web CRM logic
    val unopenedLeads: List<LeadMetadata>
        get() {
            val twoHoursAgo = System.currentTimeMillis() - 2 * 60 * 60 * 1000
            return allLeads.filter { lead ->
                if (lead.status == "NOT_INTERESTED") return@filter false
                if (lead.status == "INTERESTED" || lead.status == "FOLLOW_UP") return@filter false
                if (lead.status == "NOT_PICKED" || lead.status == "NOT_REACHABLE") {
                    val updatedAt = parseTimestamp(lead.updatedAt)
                    return@filter updatedAt <= twoHoursAgo
                }
                true
            }
        }

    val notInterestedLeads: List<LeadMetadata>
        get() = allLeads.filter { it.status == "NOT_INTERESTED" }

    val unreachableLeads: List<LeadMetadata>
        get() {
            val twoHoursAgo = System.currentTimeMillis() - 2 * 60 * 60 * 1000
            return allLeads.filter { lead ->
                if (lead.status == "NOT_PICKED" || lead.status == "NOT_REACHABLE") {
                    val updatedAt = parseTimestamp(lead.updatedAt)
                    return@filter updatedAt > twoHoursAgo
                }
                false
            }
        }

    // Enquiry leads — INTERESTED / FOLLOW_UP status
    val enquiryLeads: List<LeadMetadata>
        get() = allLeads.filter { it.status == "INTERESTED" || it.status == "FOLLOW_UP" }

    val displayedLeads: List<LeadMetadata>
        get() = when (currentTab) {
            "not_interested" -> notInterestedLeads
            "unreachable" -> unreachableLeads
            "enquiries" -> enquiryLeads
            else -> unopenedLeads
        }

    fun fetchLeads() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = repository.getAssignedLeads()
            isLoading = false
            if (result.isSuccess) {
                allLeads = result.getOrDefault(emptyList())
                lastRefreshTime = System.currentTimeMillis()
                AppLogger.info("Leads", "Fetched ${allLeads.size} leads")
            } else {
                errorMessage = result.exceptionOrNull()?.message ?: "Failed to load leads"
                AppLogger.error("Leads", "Failed to fetch leads", result.exceptionOrNull())
            }
        }
    }

    // Auto-refresh every 30 seconds
    fun startAutoRefresh() {
        if (autoRefreshJob?.isActive == true) return
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                delay(30_000L)
                val result = repository.getAssignedLeads()
                if (result.isSuccess) {
                    allLeads = result.getOrDefault(emptyList())
                    lastRefreshTime = System.currentTimeMillis()
                    AppLogger.info("Leads", "Auto-refreshed: ${allLeads.size} leads")
                }
            }
        }
    }

    fun stopAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = null
    }

    override fun onCleared() {
        super.onCleared()
        stopAutoRefresh()
    }

    var isMockCallMode by mutableStateOf(repository.isMockCallMode())
        private set

    fun toggleMockCallMode(enabled: Boolean) {
        repository.setMockCallMode(enabled)
        isMockCallMode = enabled
    }

    fun selectLead(lead: LeadMetadata) {
        selectedLead = lead
    }

    fun initiateCall(lead: LeadMetadata, onDial: (String) -> Unit) {
        val phone = lead.mobile ?: lead.phone ?: ""
        if (phone.isBlank()) {
            errorMessage = "No phone number available for this client"
            return
        }

        viewModelScope.launch {
            val callAttemptStartTime = System.currentTimeMillis()
            val result = repository.startCallAttempt(lead.id, phone)
            val callAttemptId = if (result.isSuccess) {
                result.getOrThrow()
            } else {
                AppLogger.warn("Call", "Failed to register call attempt on backend, using local ID")
                "mock_attempt_${System.currentTimeMillis()}"
            }
            
            repository.saveActiveCallAttempt(callAttemptId, lead.id, phone, callAttemptStartTime)
            AppLogger.info("Call", "Call initiated for ${lead.fullName}", "Phone: $phone, AttemptID: $callAttemptId")
            
            if (isMockCallMode) {
                onDial("MOCK_CALL")
            } else {
                onDial(phone)
            }
        }
    }

    // Update lead status via API
    var isUpdatingStatus by mutableStateOf(false)
        private set

    fun updateLeadStatus(
        leadId: String,
        status: String,
        reason: String? = null,
        enquiryDetails: Map<String, Any?>? = null,
        onComplete: (Boolean) -> Unit
    ) {
        isUpdatingStatus = true
        viewModelScope.launch {
            val result = repository.updateLeadStatus(leadId, status, reason, enquiryDetails)
            isUpdatingStatus = false
            if (result.isSuccess) {
                AppLogger.info("Lead", "Status updated to $status for lead $leadId")
                fetchLeads() // Refresh leads list
                onComplete(true)
            } else {
                AppLogger.error("Lead", "Failed to update status: ${result.exceptionOrNull()?.message}", result.exceptionOrNull())
                errorMessage = result.exceptionOrNull()?.message ?: "Failed to update lead"
                onComplete(false)
            }
        }
    }

    // Calculate remaining timer for unreachable leads
    fun getTimerText(updatedAt: String?): String {
        val ts = parseTimestamp(updatedAt)
        val expiresAt = ts + 2 * 60 * 60 * 1000
        val remaining = expiresAt - System.currentTimeMillis()
        if (remaining <= 0) return "Ready"
        val mins = (remaining / (60 * 1000)).toInt()
        return if (mins >= 60) {
            val hrs = mins / 60
            val remMins = mins % 60
            "${hrs}h ${remMins}m left"
        } else {
            "${mins}m left"
        }
    }

    private fun parseTimestamp(ts: String?): Long {
        if (ts == null) return 0
        return try {
            // Handle ISO 8601 formats from API: "2026-06-19T17:25:20.123Z" or "2026-06-19T17:25:20Z"
            // Strip milliseconds and Z suffix, parse as UTC
            val cleaned = ts
                .replace("Z", "")           // Remove Z suffix
                .replace(Regex("\\.[0-9]+$"), "") // Remove .123 milliseconds
                .take(19)                    // "yyyy-MM-ddTHH:mm:ss"

            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            sdf.parse(cleaned)?.time ?: 0
        } catch (_: Exception) {
            0
        }
    }
}

class LeadsViewModelFactory(private val repository: CrmRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LeadsViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return LeadsViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
