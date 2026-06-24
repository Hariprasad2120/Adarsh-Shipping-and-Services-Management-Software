package com.monolith.crm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import com.monolith.crm.ui.theme.OrangeAlert

@Composable
fun ConsentScreen(
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    val scrollState = rememberScrollState()
    var termsAccepted by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .verticalScroll(scrollState)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSurface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "EMPLOYEE CONSENT & AGREEMENT",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Notice regarding corporate CRM, HRMS, call auditing, biometric data, and location tracking:",
                    color = OrangeAlert,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Monolith Engine Mobile syncs company leads, HR data, and employee attendance records to the central Adarsh Shipping databases. " +
                            "By tapping 'I AGREE & PROCEED', you explicitly grant permission to the app to:\n\n" +
                            "CRM MODULE:\n" +
                            "1. Initiate client phone connections through your device's native dialer.\n" +
                            "2. Scan your designated Call Recording storage directory after calling.\n" +
                            "3. Transcribe and sync outbound business call recording audio files automatically to the CRM server for manager review, training audits, and quality control.\n\n" +
                            "HRMS MODULE:\n" +
                            "4. Access your device camera to capture face biometric data for attendance check-in/check-out verification.\n" +
                            "5. Store an encrypted facial descriptor (128-dimension numeric vector) on the company server for identity verification. This is NOT a photograph.\n" +
                            "6. Access your device GPS to capture your location during check-in, check-out, and throughout working hours.\n" +
                            "7. Run a background location tracking service during working hours (hourly intervals) and on-duty trips (5-minute intervals). This service cannot be disabled while tracking is active.\n" +
                            "8. Detect and report mock/fake GPS locations to the administration.\n" +
                            "9. Send offline alerts to your manager and admin if your device goes offline during active tracking.\n" +
                            "10. Calculate travel distance and fuel reimbursement based on GPS route data during on-duty trips.\n\n" +
                            "All data is stored securely with AES-256-GCM encryption and is accessible only to authorized HR administrators and your reporting manager.",
                    color = OnSurfaceVariant,
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                    textAlign = TextAlign.Start
                )

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = termsAccepted,
                        onCheckedChange = { termsAccepted = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = CyanPrimary,
                            uncheckedColor = OnSurfaceVariant,
                            checkmarkColor = DarkBackground
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "I have read and accept all of the terms, privacy notices, corporate call tracking policies, and biometric/location data collection policies.",
                        color = OnSurface,
                        fontSize = 11.sp,
                        lineHeight = 14.sp
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onAccept,
                    enabled = termsAccepted,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CyanPrimary,
                        disabledContainerColor = CyanPrimary.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "I AGREE & PROCEED",
                        color = if (termsAccepted) DarkBackground else DarkBackground.copy(alpha = 0.5f),
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(
                    onClick = onDecline,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("DECLINE", color = Color.Red, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
