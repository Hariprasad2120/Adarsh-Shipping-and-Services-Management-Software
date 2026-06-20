package com.monolith.crm

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.ui.components.AppLogger
import com.monolith.crm.ui.components.DebugLogOverlay
import com.monolith.crm.ui.screens.*
import com.monolith.crm.ui.theme.MonolithSalesCRMTheme
import com.monolith.crm.ui.viewmodel.*

class MainActivity : ComponentActivity() {

    private val app by lazy { application as CrmApp }
    private val repository by lazy { app.repository }

    private val authViewModel: AuthViewModel by viewModels { AuthViewModelFactory(repository) }
    private val leadsViewModel: LeadsViewModel by viewModels { LeadsViewModelFactory(repository) }
    private val callTrackingViewModel: CallTrackingViewModel by viewModels { CallTrackingViewModelFactory(repository) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppLogger.info("App", "MainActivity created", "Build: 1.0-debug")

        setContent {
            MonolithSalesCRMTheme {
                Box(modifier = Modifier.fillMaxSize()) {
                    MainNavigation()
                    // Floating debug log overlay — always on top
                    DebugLogOverlay()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        callTrackingViewModel.checkActiveCall()
    }

    @Composable
    fun MainNavigation() {
        var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }
        var activeLeadForDetail by remember { mutableStateOf<LeadMetadata?>(null) }
        var activeLeadForOutcome by remember { mutableStateOf<LeadMetadata?>(null) }

        when {
            !authViewModel.hasConsent -> {
                ConsentScreen(
                    onAccept = { authViewModel.submitConsent(true) {} },
                    onDecline = { finish() }
                )
            }
            !authViewModel.isLoggedIn -> {
                LoginScreen(
                    viewModel = authViewModel,
                    onLoginSuccess = { leadsViewModel.fetchLeads() }
                )
            }
            !authViewModel.hasFolderSetup -> {
                FolderSetupScreen(
                    viewModel = authViewModel,
                    onSetupCompleted = { callTrackingViewModel.checkActiveCall() }
                )
            }
            // Post-call outcome screen (after call completes)
            currentScreen is Screen.PostCallOutcome && activeLeadForOutcome != null -> {
                PostCallOutcomeScreen(
                    lead = activeLeadForOutcome!!,
                    leadsViewModel = leadsViewModel,
                    callTrackingViewModel = callTrackingViewModel,
                    onCompleted = {
                        activeLeadForOutcome = null
                        activeLeadForDetail = null
                        currentScreen = Screen.Dashboard
                        leadsViewModel.fetchLeads()
                    }
                )
            }
            // Legacy: if there's an active call from a previous session (orphaned)
            callTrackingViewModel.activeCall != null && currentScreen !is Screen.LeadDetails -> {
                ScanConfirmScreen(
                    viewModel = callTrackingViewModel,
                    onCompleted = {
                        callTrackingViewModel.checkActiveCall()
                        currentScreen = Screen.Dashboard
                    }
                )
            }
            else -> {
                when (currentScreen) {
                    is Screen.Dashboard -> {
                        LeadsScreen(
                            viewModel = leadsViewModel,
                            onLeadSelected = { lead ->
                                activeLeadForDetail = lead
                                currentScreen = Screen.LeadDetails
                            },
                            onLogout = { authViewModel.logout() }
                        )
                    }
                    is Screen.LeadDetails -> {
                        activeLeadForDetail?.let { lead ->
                            LeadDetailScreen(
                                lead = lead,
                                viewModel = leadsViewModel,
                                onBack = {
                                    activeLeadForDetail = null
                                    currentScreen = Screen.Dashboard
                                },
                                onDialRequested = { phone ->
                                    // After dialing, transition to post-call outcome
                                    activeLeadForOutcome = lead
                                    if (phone == "MOCK_CALL") {
                                        // Mock: go directly to outcome screen
                                        currentScreen = Screen.PostCallOutcome
                                    } else {
                                        // Real call: open dialer, outcome shown on return
                                        val intent = Intent(Intent.ACTION_DIAL).apply {
                                            data = Uri.parse("tel:$phone")
                                        }
                                        startActivity(intent)
                                        currentScreen = Screen.PostCallOutcome
                                    }
                                }
                            )
                        } ?: run {
                            currentScreen = Screen.Dashboard
                        }
                    }
                    else -> {
                        currentScreen = Screen.Dashboard
                    }
                }
            }
        }
    }

    sealed interface Screen {
        object Dashboard : Screen
        object LeadDetails : Screen
        object PostCallOutcome : Screen
    }
}
