package com.monolith.crm.ui.screens

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.ui.components.AppLogger
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import com.monolith.crm.ui.theme.OrangeAlert
import com.monolith.crm.ui.viewmodel.CallTrackingViewModel
import com.monolith.crm.ui.viewmodel.LeadsViewModel
import kotlinx.coroutines.delay

/**
 * Post-call outcome screen with TWO phases:
 *   Phase 1: Select call outcome (Interested/Not Interested/Not Picked/Not Reachable)
 *   Phase 2: Upload call recording (Auto-scan / Manual select / Skip)
 */
@Composable
fun PostCallOutcomeScreen(
    lead: LeadMetadata,
    leadsViewModel: LeadsViewModel,
    callTrackingViewModel: CallTrackingViewModel,
    onCompleted: () -> Unit
) {
    val context = LocalContext.current

    // Phase: OUTCOME → form entry, RECORDING → upload step
    var phase by remember { mutableStateOf("OUTCOME") }
    var selectedOutcome by remember { mutableStateOf<String?>(null) }
    var notInterestedReason by remember { mutableStateOf("") }

    // Enquiry form fields
    var cargoType by remember { mutableStateOf("") }
    var volume by remember { mutableStateOf("") }
    var originPort by remember { mutableStateOf("") }
    var destinationPort by remember { mutableStateOf("") }
    var isPerishable by remember { mutableStateOf(false) }
    var remarks by remember { mutableStateOf("") }
    var statusChangeReason by remember { mutableStateOf("") }

    // Timer
    val callStartTime = callTrackingViewModel.activeCall?.startTime ?: System.currentTimeMillis()
    var elapsedSeconds by remember { mutableStateOf(0L) }
    var isSubmitting by remember { mutableStateOf(false) }

    // Recording upload state
    var uploadDone by remember { mutableStateOf(false) }
    var uploadStatusText by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        while (true) {
            elapsedSeconds = (System.currentTimeMillis() - callStartTime) / 1000
            delay(1000)
        }
    }

    BackHandler(enabled = selectedOutcome == "INTERESTED" || phase == "RECORDING") {
        // Block back during interested form or recording upload
    }

    // File picker for manual recording selection
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { selectedUri ->
            // Read real file data in background
            callTrackingViewModel.prepareManualUpload(context, selectedUri) { matched ->
                if (matched != null) {
                    callTrackingViewModel.uploadWithProgress(context, matched) { success ->
                        uploadDone = success
                        uploadStatusText = if (success) "Recording uploaded successfully!" else "Upload failed — queued for retry"
                    }
                } else {
                    AppLogger.error("Upload", "Failed to read selected file")
                }
            }
        }
    }

    // Helper: submit status then move to recording phase
    fun submitStatusAndProceed(
        status: String,
        reason: String? = null,
        enquiryDetails: Map<String, Any?>? = null
    ) {
        isSubmitting = true
        
        // First: mark the call attempt as COMPLETED on the backend
        val activeCallData = callTrackingViewModel.activeCall
        if (activeCallData != null) {
            val callDuration = ((System.currentTimeMillis() - activeCallData.startTime) / 1000).toInt()
            val callStatus = when (status) {
                "NOT_PICKED" -> "NO_ANSWER"
                "NOT_REACHABLE" -> "UNREACHABLE"
                else -> "COMPLETED"
            }
            callTrackingViewModel.completeCallAttempt(
                attemptId = activeCallData.attemptId,
                duration = callDuration,
                status = callStatus
            )
            AppLogger.info("Call", "Call attempt ${activeCallData.attemptId} marked as $callStatus (${callDuration}s)")
        }

        // Then: update lead status
        leadsViewModel.updateLeadStatus(
            leadId = lead.id,
            status = status,
            reason = reason,
            enquiryDetails = enquiryDetails
        ) { success ->
            isSubmitting = false
            if (success) {
                AppLogger.info("Outcome", "Lead ${lead.id} marked as $status")
                // For NOT_PICKED/NOT_REACHABLE — skip recording, close directly
                if (status == "NOT_PICKED" || status == "NOT_REACHABLE") {
                    callTrackingViewModel.clearActiveCall()
                    onCompleted()
                } else {
                    // For INTERESTED/NOT_INTERESTED — go to recording upload phase
                    phase = "RECORDING"
                    // Auto-scan in background
                    callTrackingViewModel.scanCallRecordings(context) { matches ->
                        if (matches.isNotEmpty() && matches.first().matchConfidence >= 70) {
                            // Auto-upload best match but still show the screen
                            AppLogger.info("Recording", "Auto-matched: ${matches.first().fileName}")
                        }
                    }
                }
            } else {
                AppLogger.error("Outcome", "Failed to update lead status")
            }
        }
    }

    Scaffold(containerColor = DarkBackground) { paddingValues ->
        if (phase == "RECORDING") {
            // ══════════════════════════════════════
            //  PHASE 2: RECORDING UPLOAD
            // ══════════════════════════════════════
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // STATE: Uploading in progress — show progress bar
                if (callTrackingViewModel.isUploading) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("⬆️", fontSize = 36.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "UPLOADING RECORDING...",
                                color = CyanPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            // Progress bar
                            LinearProgressIndicator(
                                progress = callTrackingViewModel.uploadProgress,
                                color = CyanPrimary,
                                trackColor = DarkBackground,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "${(callTrackingViewModel.uploadProgress * 100).toInt()}%",
                                color = CyanPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                when {
                                    callTrackingViewModel.uploadProgress < 0.1f -> "Preparing file..."
                                    callTrackingViewModel.uploadProgress < 0.3f -> "Reading audio data..."
                                    callTrackingViewModel.uploadProgress < 0.5f -> "Sending to server..."
                                    callTrackingViewModel.uploadProgress < 0.95f -> "Server processing..."
                                    else -> "Finalizing..."
                                },
                                color = OnSurfaceVariant,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
                // STATE: Upload completed — show confirmation
                else if (uploadDone) {
                    // Animated success card
                    val scaleAnim = remember { androidx.compose.animation.core.Animatable(0f) }
                    val glowAlpha = rememberInfiniteTransition(label = "glow").animateFloat(
                        initialValue = 0.3f,
                        targetValue = 0.8f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(1200, easing = EaseInOut),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "glow_alpha"
                    )
                    val textAlpha = remember { androidx.compose.animation.core.Animatable(0f) }
                    var countdownSeconds by remember { mutableStateOf(3) }

                    LaunchedEffect(Unit) {
                        // Scale-in bounce animation
                        scaleAnim.animateTo(
                            targetValue = 1f,
                            animationSpec = spring(
                                dampingRatio = 0.5f,
                                stiffness = 300f
                            )
                        )
                        // Fade in text after checkmark animation
                        textAlpha.animateTo(1f, animationSpec = tween(500))
                        // Auto-navigate countdown
                        while (countdownSeconds > 0) {
                            delay(1000)
                            countdownSeconds--
                        }
                        callTrackingViewModel.clearActiveCall()
                        onCompleted()
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        border = BorderStroke(
                            2.dp,
                            CyanPrimary.copy(alpha = glowAlpha.value)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Animated checkmark with glow
                            Box(contentAlignment = Alignment.Center) {
                                // Outer glow ring
                                Box(
                                    modifier = Modifier
                                        .size((60 * scaleAnim.value).dp)
                                        .clip(RoundedCornerShape(50))
                                        .background(CyanPrimary.copy(alpha = glowAlpha.value * 0.15f))
                                )
                                // Checkmark circle
                                Box(
                                    modifier = Modifier
                                        .size((44 * scaleAnim.value).dp)
                                        .clip(RoundedCornerShape(50))
                                        .background(CyanPrimary.copy(alpha = 0.9f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Check,
                                        contentDescription = "Success",
                                        tint = DarkBackground,
                                        modifier = Modifier.size((24 * scaleAnim.value).dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "RECORDING UPLOADED",
                                color = CyanPrimary.copy(alpha = textAlpha.value),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp
                            )
                            uploadStatusText?.let {
                                Text(
                                    it,
                                    color = OnSurfaceVariant.copy(alpha = textAlpha.value),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Returning to leads in ${countdownSeconds}s...",
                                color = OnSurfaceVariant.copy(alpha = 0.6f),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    callTrackingViewModel.clearActiveCall()
                                    onCompleted()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("DONE — BACK TO LEADS", color = DarkBackground, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                // STATE: Upload error
                else if (callTrackingViewModel.uploadError != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("⚠️", fontSize = 36.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("UPLOAD FAILED", color = OrangeAlert, fontSize = 14.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                            Text(
                                callTrackingViewModel.uploadError ?: "Unknown error",
                                color = OnSurfaceVariant,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(top = 4.dp),
                                textAlign = TextAlign.Center
                            )
                            Text(
                                "Recording queued for background retry.",
                                color = OnSurfaceVariant,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { filePickerLauncher.launch("audio/*") },
                                colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("TRY DIFFERENT FILE", color = DarkBackground, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(
                                onClick = {
                                    callTrackingViewModel.clearActiveCall()
                                    onCompleted()
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("CONTINUE WITHOUT UPLOAD", color = OnSurfaceVariant)
                            }
                        }
                    }
                }
                // STATE: Scanning folder
                else if (callTrackingViewModel.isScanning) {
                    CircularProgressIndicator(color = CyanPrimary)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Scanning call recordings folder...",
                        color = Color.White,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = "Looking for: ${lead.mobile ?: lead.phone ?: "recording"}",
                        color = OnSurfaceVariant,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                // STATE: No recordings found
                else if (callTrackingViewModel.scanResults.isEmpty()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "NO MATCHING RECORDING FOUND",
                                color = OrangeAlert,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Lead status has been updated. Now upload the call recording.",
                                color = OnSurfaceVariant,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            // RETRY SCAN
                            Button(
                                onClick = {
                                    callTrackingViewModel.scanCallRecordings(context) { matches ->
                                        if (matches.isNotEmpty() && matches.first().matchConfidence >= 70) {
                                            callTrackingViewModel.uploadWithProgress(context, matches.first()) { success ->
                                                uploadDone = success
                                                uploadStatusText = if (success) "Auto-matched recording uploaded" else "Upload failed"
                                            }
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("RETRY SCAN", color = DarkBackground, fontWeight = FontWeight.Bold)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // MANUALLY SELECT
                            Button(
                                onClick = { filePickerLauncher.launch("audio/*") },
                                colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, CyanPrimary, RoundedCornerShape(20.dp))
                            ) {
                                Text("MANUALLY SELECT RECORDING", color = CyanPrimary, fontWeight = FontWeight.Bold)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // SKIP
                            TextButton(
                                onClick = {
                                    callTrackingViewModel.clearActiveCall()
                                    onCompleted()
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("SKIP RECORDING SYNC", color = Color.Red, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                // STATE: Recordings found — show matches
                else {
                    Text(
                        text = "CONFIRM CALL RECORDING",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    Text(
                        text = "Select the correct recording to upload:",
                        color = OnSurfaceVariant,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(callTrackingViewModel.scanResults) { match ->
                            MatchedFileCard(match = match) {
                                callTrackingViewModel.uploadWithProgress(context, match) { success ->
                                    uploadDone = success
                                    uploadStatusText = if (success) "Recording '${match.fileName}' uploaded" else "Upload failed"
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { filePickerLauncher.launch("audio/*") },
                        colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, CyanPrimary, RoundedCornerShape(20.dp))
                    ) {
                        Text("CHOOSE ANOTHER FILE MANUALLY", color = CyanPrimary, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    TextButton(
                        onClick = {
                            callTrackingViewModel.clearActiveCall()
                            onCompleted()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("SKIP UPLOAD", color = Color.Red)
                    }
                }
            }
        } else {
            // ══════════════════════════════════════
            //  PHASE 1: OUTCOME SELECTION
            // ══════════════════════════════════════
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                // Header: Lead info + Timer
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("POST-CALL OUTCOME", color = CyanPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                                Text(lead.fullName, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
                                Text(lead.company, color = OnSurfaceVariant, fontSize = 12.sp)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("CALL TIME", color = OnSurfaceVariant, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                                Text(
                                    text = formatDuration(elapsedSeconds),
                                    color = CyanPrimary,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (selectedOutcome == null) {
                    // ── OUTCOME SELECTION ──
                    Text("HOW WAS THE CALL?", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    OutcomeButton(
                        label = "INTERESTED",
                        subtitle = "Client wants to proceed. Collect enquiry details.",
                        color = Color(0xFF10B981),
                        onClick = { selectedOutcome = "INTERESTED" }
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutcomeButton(
                        label = "NOT INTERESTED",
                        subtitle = "Client declined. Provide reason.",
                        color = Color(0xFFF43F5E),
                        onClick = { selectedOutcome = "NOT_INTERESTED" }
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutcomeButton(
                        label = "NOT PICKED",
                        subtitle = "Call was not answered. 2-hour follow-up auto-set.",
                        color = OrangeAlert,
                        onClick = { submitStatusAndProceed("NOT_PICKED") }
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutcomeButton(
                        label = "NOT REACHABLE",
                        subtitle = "Line busy or switched off. 2-hour follow-up auto-set.",
                        color = OrangeAlert,
                        onClick = { submitStatusAndProceed("NOT_REACHABLE") }
                    )

                } else if (selectedOutcome == "INTERESTED") {
                    // ── ENQUIRY DETAILS FORM ──
                    Text("ENQUIRY DETAILS", color = CyanPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text("Collect details from the client during the call", color = OnSurfaceVariant, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
                    Spacer(modifier = Modifier.height(16.dp))

                    EnquiryField(label = "CARGO / SERVICE TYPE", value = cargoType, onValueChange = { cargoType = it }, placeholder = "e.g. Container, Bulk, LCL")
                    EnquiryField(label = "VOLUME / QUANTITY", value = volume, onValueChange = { volume = it }, placeholder = "e.g. 20 TEU, 50 MT")
                    EnquiryField(label = "ORIGIN PORT / CITY", value = originPort, onValueChange = { originPort = it }, placeholder = "e.g. Chennai, JNPT")
                    EnquiryField(label = "DESTINATION PORT / CITY", value = destinationPort, onValueChange = { destinationPort = it }, placeholder = "e.g. Singapore, Dubai")

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("PERISHABLE CARGO", color = OnSurfaceVariant, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        Switch(
                            checked = isPerishable,
                            onCheckedChange = { isPerishable = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = CyanPrimary)
                        )
                    }

                    EnquiryField(label = "REASON / CALL REMARKS", value = statusChangeReason, onValueChange = { statusChangeReason = it }, placeholder = "How did the client show interest?", isMultiLine = true)
                    EnquiryField(label = "ADDITIONAL NOTES", value = remarks, onValueChange = { remarks = it }, placeholder = "Any other details discussed...", isMultiLine = true)

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            val enquiry = mapOf(
                                "cargoType" to cargoType.ifBlank { null },
                                "volume" to volume.ifBlank { null },
                                "originPort" to originPort.ifBlank { null },
                                "destinationPort" to destinationPort.ifBlank { null },
                                "isPerishable" to isPerishable,
                                "remarks" to remarks.ifBlank { null },
                                "statusChangeReason" to statusChangeReason.ifBlank { null },
                                "collectedVia" to "mobile_app",
                                "collectedAt" to System.currentTimeMillis().toString()
                            )
                            submitStatusAndProceed("INTERESTED", statusChangeReason.ifBlank { null }, enquiry)
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(color = DarkBackground, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Check, contentDescription = null, tint = DarkBackground)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("SUBMIT & UPLOAD RECORDING", color = DarkBackground, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { selectedOutcome = null }) {
                        Text("← BACK TO OUTCOME SELECTION", color = OnSurfaceVariant, fontSize = 11.sp)
                    }

                } else if (selectedOutcome == "NOT_INTERESTED") {
                    // ── NOT INTERESTED REASON ──
                    Text("NOT INTERESTED — REASON", color = Color(0xFFF43F5E), fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = notInterestedReason,
                        onValueChange = { notInterestedReason = it },
                        label = { Text("Why is the client not interested?", color = OnSurfaceVariant) },
                        placeholder = { Text("e.g. Price too high, chose competitor, no requirement", color = OnSurfaceVariant.copy(alpha = 0.5f)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = CyanPrimary,
                            unfocusedBorderColor = Color(0xFF30363d)
                        ),
                        minLines = 3,
                        maxLines = 5,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Done)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            if (notInterestedReason.isBlank()) {
                                leadsViewModel.errorMessage = "Please enter a reason"
                                return@Button
                            }
                            submitStatusAndProceed("NOT_INTERESTED", notInterestedReason)
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF43F5E)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("MARK NOT INTERESTED & UPLOAD", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { selectedOutcome = null }) {
                        Text("← BACK TO OUTCOME SELECTION", color = OnSurfaceVariant, fontSize = 11.sp)
                    }
                }

                // Error message
                leadsViewModel.errorMessage?.let {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(it, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                if (isSubmitting) {
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        color = CyanPrimary,
                        trackColor = DarkSurface,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp))
                    )
                }

                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
private fun OutcomeButton(
    label: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, color.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(4.dp, 36.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(color)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label, color = color, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 0.5.sp)
                Text(subtitle, color = OnSurfaceVariant, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun EnquiryField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isMultiLine: Boolean = false
) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(label, color = OnSurfaceVariant, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(modifier = Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = OnSurfaceVariant.copy(alpha = 0.4f), fontSize = 12.sp) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = CyanPrimary,
                unfocusedBorderColor = Color(0xFF30363d)
            ),
            minLines = if (isMultiLine) 2 else 1,
            maxLines = if (isMultiLine) 4 else 1,
            modifier = Modifier.fillMaxWidth(),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences)
        )
    }
}

private fun formatDuration(totalSeconds: Long): String {
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}
