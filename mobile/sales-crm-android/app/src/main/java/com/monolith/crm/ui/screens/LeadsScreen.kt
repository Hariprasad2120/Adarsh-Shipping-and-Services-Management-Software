package com.monolith.crm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.CrmApp
import com.monolith.crm.data.remote.LeadMetadata
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import com.monolith.crm.ui.theme.OrangeAlert
import com.monolith.crm.ui.viewmodel.LeadsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeadsScreen(
    viewModel: LeadsViewModel,
    onLeadSelected: (LeadMetadata) -> Unit,
    onMonaClicked: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val repository = remember {
        (context.applicationContext as? CrmApp)?.repository
    }

    val currentVersionCode = remember {
        try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
        } catch (_: Exception) {
            1L
        }
    }
    val currentVersionName = remember {
        try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0"
        } catch (_: Exception) {
            "1.0"
        }
    }

    var showChangelog by remember { mutableStateOf(false) }

    LaunchedEffect(repository) {
        repository?.let { repo ->
            val lastViewed = repo.getLastViewedChangelogVersion()
            if (currentVersionCode > lastViewed) {
                showChangelog = true
            }
        }
    }

    if (showChangelog) {
        AlertDialog(
            onDismissRequest = {
                repository?.setLastViewedChangelogVersion(currentVersionCode)
                showChangelog = false
            },
            title = {
                Text(
                    text = "WHAT'S NEW IN V$currentVersionName (BUILD $currentVersionCode)",
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    color = Color.White
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "We have updated the Monolith CRM Client to improve security and UI experience:",
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    listOf(
                        "🔒 Saved corporate login credentials securely using EncryptedSharedPreferences.",
                        "💎 Integrated 3D rotating prism wireframe logo on the login screen.",
                        "📲 Added automated in-app updater to push silent APK updates.",
                        "⚙️ Repositioned the debug FAB to the top-right to prevent layout blocking.",
                        "⚠️ Reset consent terms screen automatically upon new build installations.",
                        "🔔 Request CRM outbound and media audio permissions on terms agreement."
                    ).forEach { item ->
                        Text(
                            text = "• $item",
                            fontSize = 11.sp,
                            color = OnSurfaceVariant
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        repository?.setLastViewedChangelogVersion(currentVersionCode)
                        showChangelog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)
                ) {
                    Text("DISMISS", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            },
            containerColor = DarkSurface
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("MONOLITH CRM", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Text("ASSIGNED LEADS", color = CyanPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                },
                actions = {
                    IconButton(onClick = onMonaClicked) {
                        Icon(Icons.Default.Send, contentDescription = "Mona Assistant", tint = CyanPrimary)
                    }
                    IconButton(onClick = { viewModel.fetchLeads() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = Color(0xFFef4444))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground)
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Mock Call Toggle
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("MOCK CALL TEST MODE", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                        Text("Simulate calls without launching phone dialer", color = OnSurfaceVariant, fontSize = 10.sp)
                    }
                    Switch(
                        checked = viewModel.isMockCallMode,
                        onCheckedChange = { viewModel.toggleMockCallMode(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = CyanPrimary
                        )
                    )
                }
            }

            // Tab Row — matching web CRM tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 4.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TabChip(
                    label = "UNOPENED",
                    count = viewModel.unopenedLeads.size,
                    isSelected = viewModel.currentTab == "unopened",
                    onClick = { viewModel.currentTab = "unopened" },
                    modifier = Modifier.weight(1f)
                )
                TabChip(
                    label = "NOT INTERESTED",
                    count = viewModel.notInterestedLeads.size,
                    isSelected = viewModel.currentTab == "not_interested",
                    onClick = { viewModel.currentTab = "not_interested" },
                    modifier = Modifier.weight(1f)
                )
                TabChip(
                    label = "UNREACHABLE",
                    count = viewModel.unreachableLeads.size,
                    isSelected = viewModel.currentTab == "unreachable",
                    onClick = { viewModel.currentTab = "unreachable" },
                    modifier = Modifier.weight(1f)
                )
            }

            // Content
            if (viewModel.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CyanPrimary)
                }
            } else if (viewModel.displayedLeads.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = when (viewModel.currentTab) {
                                "not_interested" -> "No uninterested leads"
                                "unreachable" -> "No unreachable leads"
                                else -> "No active leads"
                            },
                            color = OnSurfaceVariant,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = when (viewModel.currentTab) {
                                "not_interested" -> "Leads marked as Not Interested show here"
                                "unreachable" -> "Not Picked / Not Reachable leads in 2hr cooldown show here"
                                else -> "All leads have been processed or are in cooldown"
                            },
                            color = OnSurfaceVariant.copy(alpha = 0.6f),
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(viewModel.displayedLeads) { lead ->
                        LeadCard(
                            lead = lead,
                            isUnreachableTab = viewModel.currentTab == "unreachable",
                            timerText = if (viewModel.currentTab == "unreachable") viewModel.getTimerText(lead.updatedAt) else null,
                            onClick = { onLeadSelected(lead) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
private fun TabChip(
    label: String,
    count: Int,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bgColor = if (isSelected) CyanPrimary.copy(alpha = 0.15f) else DarkSurface
    val textColor = if (isSelected) CyanPrimary else OnSurfaceVariant
    val borderColor = if (isSelected) CyanPrimary.copy(alpha = 0.4f) else Color.Transparent

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = bgColor,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(1.dp, borderColor) else null
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label,
                color = textColor,
                fontSize = 8.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.8.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "$count",
                color = textColor,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun LeadCard(
    lead: LeadMetadata,
    isUnreachableTab: Boolean,
    timerText: String?,
    onClick: () -> Unit
) {
    val statusColor = when (lead.status) {
        "NEW" -> Color(0xFF3B82F6)
        "CONTACTED" -> Color(0xFFF59E0B)
        "QUALIFIED" -> Color(0xFF10B981)
        "NOT_INTERESTED" -> Color(0xFFF43F5E)
        "NOT_PICKED" -> OrangeAlert
        "NOT_REACHABLE" -> OrangeAlert
        "INTERESTED" -> Color(0xFF10B981)
        "LOST" -> Color(0xFFEF4444)
        else -> Color(0xFFF59E0B)
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = lead.fullName,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${lead.source ?: "Direct"} - ${lead.company}",
                        color = OnSurfaceVariant,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                // Status badge
                Text(
                    text = lead.status.replace("_", " "),
                    color = statusColor,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.5.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(statusColor.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }

            // Phone number
            val phone = lead.mobile ?: lead.phone
            if (phone != null) {
                Text(
                    text = "Mobile:  $phone",
                    color = OnSurfaceVariant,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            // Timer for unreachable tab
            if (isUnreachableTab && timerText != null) {
                Text(
                    text = "⏱ $timerText",
                    color = OrangeAlert,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Owner info for admin
            lead.owner?.name?.let { ownerName ->
                Text(
                    text = "Owner: $ownerName",
                    color = OnSurfaceVariant.copy(alpha = 0.6f),
                    fontSize = 10.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
