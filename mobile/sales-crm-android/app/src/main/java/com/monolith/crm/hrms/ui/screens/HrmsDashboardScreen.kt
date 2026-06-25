package com.monolith.crm.hrms.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.hrms.ui.viewmodel.HrmsViewModel
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.OrangeAlert

sealed interface HrmsScreen {
    object Dashboard : HrmsScreen
    object CheckIn : HrmsScreen
    object CheckOut : HrmsScreen
    object FaceEnroll : HrmsScreen
    object OnDuty : HrmsScreen
    object History : HrmsScreen
    object Settings : HrmsScreen
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HrmsDashboardScreen(
    viewModel: HrmsViewModel,
    onNavigate: (HrmsScreen) -> Unit,
    onSettingsClicked: () -> Unit,
    onLogout: () -> Unit
) {
    val scrollState = rememberScrollState()

    // Load dashboard on first composition
    LaunchedEffect(Unit) {
        viewModel.loadDashboard()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("HRMS", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Text(
                            viewModel.dashboardData?.user?.name?.uppercase() ?: "LOADING...",
                            color = CyanPrimary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onSettingsClicked) {
                        Icon(Icons.Default.Settings, "Settings", tint = Color.White)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, "Logout", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = CyanPrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Loading HRMS Dashboard...", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // -- Attendance Status Card --
                AttendanceStatusCard(
                    isCheckedIn = viewModel.isCheckedIn,
                    checkInTime = viewModel.checkInTime,
                    workingMinutes = viewModel.workingMinutes,
                    onCheckIn = { onNavigate(HrmsScreen.CheckIn) },
                    onCheckOut = { onNavigate(HrmsScreen.CheckOut) }
                )

                // -- Error/Success Messages --
                viewModel.errorMessage?.let {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF3D1111))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Error, null, tint = Color.Red, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(it, color = Color.Red, fontSize = 12.sp)
                        }
                    }
                }
                viewModel.checkInResult?.let {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0D2818))
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(it, color = Color(0xFF22C55E), fontSize = 12.sp)
                        }
                    }
                }

                // -- Quick Actions --
                Text("QUICK ACTIONS", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickActionCard(
                        icon = Icons.Default.DirectionsCar,
                        label = "ON-DUTY",
                        color = OrangeAlert,
                        modifier = Modifier.weight(1f),
                        onClick = { onNavigate(HrmsScreen.OnDuty) }
                    )
                    QuickActionCard(
                        icon = Icons.Default.History,
                        label = "HISTORY",
                        color = CyanPrimary,
                        modifier = Modifier.weight(1f),
                        onClick = { onNavigate(HrmsScreen.History) }
                    )
                    QuickActionCard(
                        icon = Icons.Default.Face,
                        label = if (viewModel.faceEnrolled) "FACE ✓" else "ENROLL",
                        color = if (viewModel.faceEnrolled) Color(0xFF22C55E) else OrangeAlert,
                        modifier = Modifier.weight(1f),
                        onClick = { onNavigate(HrmsScreen.FaceEnroll) }
                    )
                }

                // -- Status Indicators --
                Text("STATUS", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)

                StatusRow(
                    icon = Icons.Default.Face,
                    label = "Face Enrolled",
                    value = if (viewModel.faceEnrolled) "Active" else "Not Enrolled",
                    valueColor = if (viewModel.faceEnrolled) Color(0xFF22C55E) else OrangeAlert
                )
                StatusRow(
                    icon = Icons.Default.Gavel,
                    label = "User Agreement",
                    value = if (viewModel.agreementAccepted) "Accepted" else "Pending",
                    valueColor = if (viewModel.agreementAccepted) Color(0xFF22C55E) else OrangeAlert
                )
                StatusRow(
                    icon = Icons.Default.LocationOn,
                    label = "Location Tracking",
                    value = if (viewModel.isCheckedIn) "Active" else "Inactive",
                    valueColor = if (viewModel.isCheckedIn) CyanPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }
}

@Composable
private fun AttendanceStatusCard(
    isCheckedIn: Boolean,
    checkInTime: String?,
    workingMinutes: Int,
    onCheckIn: () -> Unit,
    onCheckOut: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.animateContentSize()
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Status indicator
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(if (isCheckedIn) CyanPrimary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isCheckedIn) Icons.Default.CheckCircle else Icons.Default.Login,
                    contentDescription = null,
                    tint = if (isCheckedIn) CyanPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                if (isCheckedIn) "CHECKED IN" else "NOT CHECKED IN",
                color = if (isCheckedIn) CyanPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp
            )

            if (isCheckedIn && checkInTime != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Since $checkInTime",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "${workingMinutes / 60}h ${workingMinutes % 60}m",
                    color = Color.White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.ExtraLight,
                    fontFamily = FontFamily.Monospace
                )
                Text("WORKING HOURS", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp, letterSpacing = 1.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = if (isCheckedIn) onCheckOut else onCheckIn,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isCheckedIn) OrangeAlert else CyanPrimary
                ),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    if (isCheckedIn) Icons.Default.Logout else Icons.Default.Login,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    if (isCheckedIn) "CHECK OUT" else "CHECK IN",
                    fontWeight = FontWeight.Bold,
                    color = if (isCheckedIn) Color.Black else Color.Black
                )
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    icon: ImageVector,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(label, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun StatusRow(
    icon: ImageVector,
    label: String,
    value: String,
    valueColor: Color
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = CyanPrimary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Text(label, color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
            Text(value, color = valueColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}
