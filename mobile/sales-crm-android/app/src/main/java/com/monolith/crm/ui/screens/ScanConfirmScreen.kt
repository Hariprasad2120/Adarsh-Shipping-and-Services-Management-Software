package com.monolith.crm.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import com.monolith.crm.ui.theme.OrangeAlert
import com.monolith.crm.ui.viewmodel.CallTrackingViewModel
import java.util.Date

@Composable
fun ScanConfirmScreen(
    viewModel: CallTrackingViewModel,
    onCompleted: () -> Unit
) {
    val context = LocalContext.current

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val name = "manual_rec_${System.currentTimeMillis()}.mp3"
            val mockMatched = CallTrackingViewModel.MatchedFile(
                fileName = name,
                fileUri = it.toString(),
                fileSize = 100 * 1024L,
                durationSeconds = 120.0f,
                recordedAt = System.currentTimeMillis(),
                sha256Hash = "manual_${System.currentTimeMillis()}",
                matchConfidence = 100.0f,
                matchReason = "User manual selection",
                isDuplicate = false
            )
            viewModel.queueUpload(context, mockMatched, onCompleted)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.scanCallRecordings(context) { matches ->
            if (matches.isNotEmpty() && matches.first().matchConfidence >= 70) {
                viewModel.queueUpload(context, matches.first(), onCompleted)
            }
        }
    }

    Scaffold(
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val call = viewModel.activeCall

            if (call == null) {
                Text("No active call attempt found.", color = OnSurfaceVariant, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = onCompleted, colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)) {
                    Text("BACK TO LEADS", color = DarkBackground)
                }
            } else if (viewModel.isScanning) {
                CircularProgressIndicator(color = CyanPrimary)
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Scanning Call recordings folder...\nPhone: ${call.phone}",
                    color = Color.White,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            } else if (viewModel.scanResults.isEmpty()) {
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

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "We couldn't find a corresponding call recording audio file automatically.",
                            color = OnSurfaceVariant,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = { viewModel.scanCallRecordings(context) { /* no-op */ } },
                            colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("RETRY SCAN", color = DarkBackground, fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

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

                        TextButton(
                            onClick = { viewModel.skipUpload(onCompleted) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("SKIP RECORDING SYNC", color = Color.Red, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                Text(
                    text = "CONFIRM CALL RECORDING",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                Text(
                    text = "Select the correct recording file to upload:",
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
                    items(viewModel.scanResults) { match ->
                        MatchedFileCard(match = match) {
                            viewModel.queueUpload(context, match, onCompleted)
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
                    onClick = { viewModel.skipUpload(onCompleted) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("SKIP UPLOAD", color = Color.Red)
                }
            }
        }
    }
}

@Composable
fun MatchedFileCard(match: CallTrackingViewModel.MatchedFile, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = match.fileName,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "Score: ${match.matchConfidence.toInt()}%",
                    color = if (match.matchConfidence >= 70) CyanPrimary else OrangeAlert,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Size: ${(match.fileSize / 1024f / 1024f).toString().take(4)}MB  •  Duration: ${match.durationSeconds.toInt()}s",
                color = OnSurfaceVariant,
                fontSize = 11.sp
            )
            Text(
                text = match.matchReason,
                color = CyanPrimary.copy(alpha = 0.8f),
                fontSize = 10.sp,
                lineHeight = 14.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
