package com.monolith.crm

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.hrms.ui.screens.*
import com.monolith.crm.hrms.ui.viewmodel.*
import com.monolith.crm.ui.components.AppLogger
import com.monolith.crm.ui.components.DebugLogOverlay
import com.monolith.crm.ui.screens.*
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.MonolithSalesCRMTheme
import com.monolith.crm.ui.viewmodel.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private val app by lazy { application as CrmApp }
    private val repository by lazy { app.repository }

    private val authViewModel: AuthViewModel by viewModels { AuthViewModelFactory(repository) }
    private val leadsViewModel: LeadsViewModel by viewModels { LeadsViewModelFactory(repository) }
    private val callTrackingViewModel: CallTrackingViewModel by viewModels { CallTrackingViewModelFactory(repository) }
    private val monaViewModel: MonaViewModel by viewModels { MonaViewModelFactory(repository) }

    // HRMS ViewModels (lazily initialized after app starts)
    private val hrmsViewModel: HrmsViewModel by viewModels {
        HrmsViewModelFactory(app.hrmsRepository, applicationContext)
    }
    private val onDutyViewModel: OnDutyViewModel by viewModels {
        OnDutyViewModelFactory(app.hrmsRepository, applicationContext)
    }

    // Version details
    private var currentVersionCode: Long = 1L

    // Global loading and update states
    private var isGlobalLoading by mutableStateOf(false)
    private var loadingText by mutableStateOf("Loading...")
    private var updateDialogInfo by mutableStateOf<com.monolith.crm.data.remote.AppUpdateResponse?>(null)

    // Theme state
    private var isDarkTheme by mutableStateOf(true)

    // Module state
    private var selectedModule by mutableStateOf("CRM")

    // Permission request launcher
    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val callGranted = permissions[android.Manifest.permission.CALL_PHONE] ?: false
        val notificationsGranted = permissions[android.Manifest.permission.POST_NOTIFICATIONS] ?: false
        val audioGranted = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            permissions[android.Manifest.permission.READ_MEDIA_AUDIO] ?: false
        } else {
            permissions[android.Manifest.permission.READ_EXTERNAL_STORAGE] ?: false
        }
        val cameraGranted = permissions[android.Manifest.permission.CAMERA] ?: false
        val locationGranted = permissions[android.Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        AppLogger.info(
            "Permissions",
            "Result: call=$callGranted, notifications=$notificationsGranted, audio=$audioGranted, camera=$cameraGranted, location=$locationGranted"
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Get package version code
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
        } catch (e: Exception) {
            AppLogger.error("App", "Failed to retrieve package info", e)
        }

        AppLogger.info("App", "MainActivity created", "Build Code: $currentVersionCode")

        // Reset terms/consent acceptance screen automatically if a new build is installed
        repository.checkAndResetConsentIfNeeded(currentVersionCode)
        // Refresh AuthViewModel's state to match
        authViewModel.hasConsent = repository.hasConsent()

        // Load theme and module preference
        isDarkTheme = repository.isDarkTheme()
        selectedModule = repository.getActiveModule()

        // Try auto-login if consent was just reset but we have valid credentials
        if (authViewModel.hasConsent && !authViewModel.isLoggedIn) {
            authViewModel.tryAutoLogin {
                if (selectedModule == "CRM") {
                    leadsViewModel.fetchLeads()
                } else {
                    hrmsViewModel.loadDashboard()
                }
            }
        }

        setContent {
            MonolithSalesCRMTheme(isDarkTheme = isDarkTheme) {
                Box(modifier = Modifier.fillMaxSize()) {
                    MainNavigation()
                    
                    // Floating debug log overlay — always on top, now draggable
                    DebugLogOverlay(repository = repository)

                    // Global Loading/Updating overlay
                    if (isGlobalLoading) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.75f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.padding(32.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    CircularProgressIndicator(color = CyanPrimary)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        text = loadingText,
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    // Dynamic In-App Update Dialog
                    updateDialogInfo?.let { update ->
                        AlertDialog(
                            onDismissRequest = {
                                // When dismissed, save the dismissed version so we don't prompt again
                                repository.setDismissedUpdateVersion(update.versionCode.toLong())
                                updateDialogInfo = null
                            },
                            title = {
                                Text(
                                    "App Update Available",
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            },
                            text = {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        "A newer version (v${update.versionName}) of the Monolith app is ready to install.",
                                        fontSize = 13.sp,
                                        color = Color.White.copy(alpha = 0.8f)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text("Changelog:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = CyanPrimary)
                                    update.changelog.forEach { change ->
                                        Text("• $change", fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f))
                                    }
                                }
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        val apkUrl = update.apkUrl
                                        updateDialogInfo = null
                                        downloadAndInstallApk(apkUrl)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)
                                ) {
                                    Text("UPDATE NOW", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = {
                                    repository.setDismissedUpdateVersion(update.versionCode.toLong())
                                    updateDialogInfo = null
                                }) {
                                    Text("LATER", color = Color.White)
                                }
                            },
                            containerColor = DarkSurface
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        callTrackingViewModel.checkActiveCall()
    }

    fun checkForUpdates(forceShow: Boolean = false) {
        lifecycleScope.launch {
            val result = repository.checkUpdate()
            if (result.isSuccess) {
                val update = result.getOrNull()
                if (update != null && update.versionCode > currentVersionCode) {
                    // Only show if not previously dismissed (unless forced from settings)
                    val dismissedVersion = repository.getDismissedUpdateVersion()
                    if (forceShow || update.versionCode.toLong() > dismissedVersion) {
                        AppLogger.info("Update", "New update detected: Code ${update.versionCode}, Name ${update.versionName}")
                        updateDialogInfo = update
                    } else {
                        AppLogger.info("Update", "Update v${update.versionCode} already dismissed, skipping notification")
                    }
                } else if (forceShow) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "You're on the latest version (v${currentVersionCode})", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                AppLogger.warn("Update", "Update check failed: ${result.exceptionOrNull()?.message}")
                if (forceShow) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Failed to check for updates", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    fun toggleTheme(dark: Boolean) {
        isDarkTheme = dark
        repository.setDarkTheme(dark)
    }

    private fun switchModule(module: String) {
        selectedModule = module
        repository.setActiveModule(module)
        AppLogger.info("Module", "Switched to $module")
        if (module == "HRMS") {
            hrmsViewModel.loadDashboard()
        } else {
            leadsViewModel.fetchLeads()
        }
    }

    private fun downloadAndInstallApk(url: String) {
        isGlobalLoading = true
        loadingText = "Downloading update..."
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val fullUrl = if (url.startsWith("http")) url else {
                    repository.getBaseUrl().removeSuffix("/") + "/" + url.removePrefix("/")
                }
                AppLogger.info("Update", "Downloading APK update from $fullUrl")
                
                val request = okhttp3.Request.Builder().url(fullUrl).build()
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(120, TimeUnit.SECONDS)
                    .build()
                val response = client.newCall(request).execute()
                if (!response.isSuccessful) throw Exception("HTTP Error: ${response.code}")
                val body = response.body ?: throw Exception("Empty response body")
                val length = body.contentLength()

                val apkFile = File(cacheDir, "update.apk")
                if (apkFile.exists()) apkFile.delete()

                val input = body.byteStream()
                val output = apkFile.outputStream()
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalRead = 0L
                
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    totalRead += bytesRead
                    if (length > 0) {
                        val progress = (totalRead * 100 / length).toInt()
                        withContext(Dispatchers.Main) {
                            loadingText = "Downloading update... $progress%"
                        }
                    }
                }
                output.flush()
                output.close()
                input.close()
                AppLogger.info("Update", "Download finished, size: ${apkFile.length()} bytes")
                
                withContext(Dispatchers.Main) {
                    isGlobalLoading = false
                    installApk(apkFile)
                }
            } catch (e: Exception) {
                AppLogger.error("Update", "Download failed: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    isGlobalLoading = false
                    Toast.makeText(this@MainActivity, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun installApk(file: File) {
        try {
            val authority = "$packageName.fileprovider"
            val apkUri = androidx.core.content.FileProvider.getUriForFile(this, authority, file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            startActivity(intent)
        } catch (e: Exception) {
            AppLogger.error("Update", "Failed to start package installer: ${e.message}", e)
            Toast.makeText(this, "Failed to launch installer: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    @Composable
    fun MainNavigation() {
        var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }
        var activeLeadForDetail by remember { mutableStateOf<LeadMetadata?>(null) }
        var activeLeadForOutcome by remember { mutableStateOf<LeadMetadata?>(null) }

        // HRMS screen state
        var currentHrmsScreen by remember { mutableStateOf<HrmsScreen>(HrmsScreen.Dashboard) }

        // Trigger automatic update check when logged in
        LaunchedEffect(authViewModel.isLoggedIn) {
            if (authViewModel.isLoggedIn) {
                checkForUpdates()
            }
        }

        when {
            !authViewModel.hasConsent -> {
                ConsentScreen(
                    onAccept = {
                        val neededPermissions = mutableListOf(
                            android.Manifest.permission.CALL_PHONE,
                            android.Manifest.permission.POST_NOTIFICATIONS,
                            android.Manifest.permission.CAMERA,
                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                            android.Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            neededPermissions.add(android.Manifest.permission.READ_MEDIA_AUDIO)
                        } else {
                            neededPermissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
                        }
                        
                        // Request permissions dynamically
                        requestPermissionsLauncher.launch(neededPermissions.toTypedArray())

                        authViewModel.submitConsent(true) {
                            repository.recordConsentAccepted(currentVersionCode)
                            // After consent, try auto-login so user doesn't need to re-enter credentials
                            val restoredModule = authViewModel.tryAutoLogin {
                                if (selectedModule == "CRM") {
                                    leadsViewModel.fetchLeads()
                                } else {
                                    hrmsViewModel.loadDashboard()
                                }
                            }
                            if (restoredModule != null) {
                                selectedModule = restoredModule
                            }
                        }
                    },
                    onDecline = { finish() }
                )
            }
            !authViewModel.isLoggedIn -> {
                LoginScreen(
                    viewModel = authViewModel,
                    selectedModule = selectedModule,
                    onModuleChanged = { module ->
                        selectedModule = module
                        repository.setActiveModule(module)
                    },
                    onLoginSuccess = {
                        if (selectedModule == "CRM") {
                            isGlobalLoading = true
                            loadingText = "Loading lead statistics..."
                            leadsViewModel.fetchLeads()
                            isGlobalLoading = false
                        } else {
                            isGlobalLoading = true
                            loadingText = "Loading HRMS dashboard..."
                            hrmsViewModel.loadDashboard()
                            isGlobalLoading = false
                        }
                    }
                )
            }
            // CRM: Folder setup (only for CRM module)
            selectedModule == "CRM" && !authViewModel.hasFolderSetup -> {
                FolderSetupScreen(
                    viewModel = authViewModel,
                    onSetupCompleted = { callTrackingViewModel.checkActiveCall() }
                )
            }
            // --- HRMS MODULE ---
            selectedModule == "HRMS" -> {
                // Back button handler for HRMS
                BackHandler(enabled = true) {
                    when {
                        currentScreen == Screen.Settings -> {
                            currentScreen = Screen.Dashboard
                        }
                        currentHrmsScreen != HrmsScreen.Dashboard -> {
                            currentHrmsScreen = HrmsScreen.Dashboard
                        }
                        else -> {
                            // On HRMS Dashboard, back = exit app
                            finish()
                        }
                    }
                }

                when (currentHrmsScreen) {
                    HrmsScreen.Dashboard -> {
                        HrmsDashboardScreen(
                            viewModel = hrmsViewModel,
                            onNavigate = { screen -> currentHrmsScreen = screen },
                            onSettingsClicked = { currentScreen = Screen.Settings },
                            onLogout = {
                                authViewModel.logout()
                            }
                        )
                    }
                    HrmsScreen.CheckIn -> {
                        CheckInOutScreen(
                            isCheckIn = true,
                            viewModel = hrmsViewModel,
                            faceNetModel = app.faceNetModel,
                            onComplete = {
                                hrmsViewModel.loadDashboard()
                                currentHrmsScreen = HrmsScreen.Dashboard
                            },
                            onBack = { currentHrmsScreen = HrmsScreen.Dashboard }
                        )
                    }
                    HrmsScreen.CheckOut -> {
                        CheckInOutScreen(
                            isCheckIn = false,
                            viewModel = hrmsViewModel,
                            faceNetModel = app.faceNetModel,
                            onComplete = {
                                hrmsViewModel.loadDashboard()
                                currentHrmsScreen = HrmsScreen.Dashboard
                            },
                            onBack = { currentHrmsScreen = HrmsScreen.Dashboard }
                        )
                    }
                    HrmsScreen.FaceEnroll -> {
                        FaceEnrollScreen(
                            repository = app.hrmsRepository,
                            faceNetModel = app.faceNetModel,
                            onComplete = {
                                hrmsViewModel.loadDashboard()
                                currentHrmsScreen = HrmsScreen.Dashboard
                            },
                            onBack = { currentHrmsScreen = HrmsScreen.Dashboard }
                        )
                    }
                    HrmsScreen.OnDuty -> {
                        OnDutyScreen(
                            viewModel = onDutyViewModel,
                            onBack = { currentHrmsScreen = HrmsScreen.Dashboard }
                        )
                    }
                    HrmsScreen.History -> {
                        AttendanceHistoryScreen(
                            viewModel = hrmsViewModel,
                            onBack = { currentHrmsScreen = HrmsScreen.Dashboard }
                        )
                    }
                    HrmsScreen.Settings -> {
                        currentScreen = Screen.Settings
                        currentHrmsScreen = HrmsScreen.Dashboard
                    }
                }

                // Show Settings overlay when requested from HRMS
                if (currentScreen == Screen.Settings) {
                    SettingsScreen(
                        repository = repository,
                        isDarkTheme = isDarkTheme,
                        selectedModule = selectedModule,
                        onThemeChanged = { dark -> toggleTheme(dark) },
                        onModuleSwitch = { module -> switchModule(module) },
                        onCheckUpdate = { checkForUpdates(forceShow = true) },
                        onBack = { currentScreen = Screen.Dashboard }
                    )
                }
            }
            // --- CRM MODULE ---
            // Post-call outcome screen (after call completes)
            currentScreen is Screen.PostCallOutcome && activeLeadForOutcome != null -> {
                PostCallOutcomeScreen(
                    lead = activeLeadForOutcome!!,
                    leadsViewModel = leadsViewModel,
                    callTrackingViewModel = callTrackingViewModel,
                    onCompleted = {
                        isGlobalLoading = true
                        loadingText = "Returning to dashboard..."
                        activeLeadForOutcome = null
                        activeLeadForDetail = null
                        currentScreen = Screen.Dashboard
                        leadsViewModel.fetchLeads()
                        isGlobalLoading = false
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
                // Back button handler for CRM module
                BackHandler(enabled = true) {
                    when (currentScreen) {
                        is Screen.Settings, is Screen.MonaChat, is Screen.LeadDetails -> {
                            activeLeadForDetail = null
                            currentScreen = Screen.Dashboard
                        }
                        else -> {
                            finish()
                        }
                    }
                }

                when (currentScreen) {
                    is Screen.Dashboard -> {
                        LeadsScreen(
                            viewModel = leadsViewModel,
                            onLeadSelected = { lead ->
                                activeLeadForDetail = lead
                                currentScreen = Screen.LeadDetails
                            },
                            onMonaClicked = {
                                isGlobalLoading = true
                                loadingText = "Connecting to Mona..."
                                currentScreen = Screen.MonaChat
                                isGlobalLoading = false
                            },
                            onSettingsClicked = {
                                currentScreen = Screen.Settings
                            },
                            onLogout = {
                                isGlobalLoading = true
                                loadingText = "Logging out..."
                                authViewModel.logout()
                                isGlobalLoading = false
                            }
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
                                    activeLeadForOutcome = lead
                                    if (phone == "MOCK_CALL") {
                                        currentScreen = Screen.PostCallOutcome
                                    } else {
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
                    is Screen.MonaChat -> {
                        MonaScreen(
                            viewModel = monaViewModel,
                            onBack = {
                                currentScreen = Screen.Dashboard
                            }
                        )
                    }
                    is Screen.Settings -> {
                        SettingsScreen(
                            repository = repository,
                            isDarkTheme = isDarkTheme,
                            selectedModule = selectedModule,
                            onThemeChanged = { dark -> toggleTheme(dark) },
                            onModuleSwitch = { module -> switchModule(module) },
                            onCheckUpdate = { checkForUpdates(forceShow = true) },
                            onBack = {
                                currentScreen = Screen.Dashboard
                            }
                        )
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
        object MonaChat : Screen
        object Settings : Screen
    }
}
