package com.monolith.crm.hrms.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.hrms.data.remote.OnDutyRequestData
import com.monolith.crm.hrms.ui.viewmodel.OnDutyViewModel
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.OrangeAlert

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnDutyScreen(
    viewModel: OnDutyViewModel,
    onBack: () -> Unit
) {
    var showCreateForm by remember { mutableStateOf(false) }
    var purpose by remember { mutableStateOf("") }
    var visitLocation by remember { mutableStateOf("") }
    var visitAddress by remember { mutableStateOf("") }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }

    // Back button: close form if open, otherwise go back
    BackHandler {
        if (showCreateForm) {
            showCreateForm = false
        } else {
            onBack()
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadRequests()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("ON-DUTY", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Text("TRIP MANAGEMENT", color = CyanPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            if (!showCreateForm) {
                FloatingActionButton(
                    onClick = { showCreateForm = true },
                    containerColor = CyanPrimary
                ) {
                    Icon(Icons.Default.Add, "Create Request", tint = Color.Black)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        if (showCreateForm) {
            // Create On-Duty Request Form
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("NEW ON-DUTY REQUEST", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)

                OutlinedTextField(
                    value = purpose,
                    onValueChange = { purpose = it },
                    label = { Text("Purpose / Reason") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = CyanPrimary, unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = visitLocation,
                    onValueChange = { visitLocation = it },
                    label = { Text("Visit Location / Client Name") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = CyanPrimary, unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = visitAddress,
                    onValueChange = { visitAddress = it },
                    label = { Text("Visit Address") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = CyanPrimary, unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = fromDate,
                        onValueChange = { fromDate = it },
                        label = { Text("From (YYYY-MM-DD)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                            focusedBorderColor = CyanPrimary, unfocusedBorderColor = MaterialTheme.colorScheme.outline
                        ),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = toDate,
                        onValueChange = { toDate = it },
                        label = { Text("To (YYYY-MM-DD)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                            focusedBorderColor = CyanPrimary, unfocusedBorderColor = MaterialTheme.colorScheme.outline
                        ),
                        modifier = Modifier.weight(1f)
                    )
                }

                viewModel.errorMessage?.let {
                    Text(it, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = { showCreateForm = false },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("CANCEL", fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = {
                            viewModel.createRequest(
                                purpose = purpose,
                                visitLocation = visitLocation.ifBlank { null },
                                visitAddress = visitAddress.ifBlank { null },
                                fromDate = fromDate,
                                toDate = toDate
                            )
                            showCreateForm = false
                        },
                        enabled = purpose.isNotBlank() && fromDate.isNotBlank() && toDate.isNotBlank() && !viewModel.isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (viewModel.isSubmitting) {
                            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            Text("SUBMIT", fontWeight = FontWeight.Bold, color = Color.Black)
                        }
                    }
                }
            }
        } else {
            // Request List
            if (viewModel.isLoading) {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CyanPrimary)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Success message
                    viewModel.successMessage?.let { msg ->
                        item {
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF0D2818))
                            ) {
                                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(msg, color = Color(0xFF22C55E), fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    if (viewModel.requests.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.DirectionsCar, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text("No on-duty requests", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                                    Text("Tap + to create a new request", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), fontSize = 11.sp)
                                }
                            }
                        }
                    } else {
                        items(viewModel.requests) { request ->
                            OnDutyRequestCard(
                                request = request,
                                onStart = { viewModel.startTrip(request.id) },
                                onComplete = { viewModel.completeTrip(request.id) },
                                isSubmitting = viewModel.isSubmitting
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OnDutyRequestCard(
    request: OnDutyRequestData,
    onStart: () -> Unit,
    onComplete: () -> Unit,
    isSubmitting: Boolean
) {
    val statusColor = when (request.status) {
        "APPROVED" -> CyanPrimary
        "IN_PROGRESS" -> OrangeAlert
        "COMPLETED" -> Color(0xFF22C55E)
        "REJECTED" -> Color.Red
        "PENDING" -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Left accent bar
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(topStart = 14.dp, bottomStart = 14.dp))
                    .background(statusColor)
            )

            Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            request.purpose ?: "On-Duty Trip",
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        if (request.visitLocation != null) {
                            Text("📍 ${request.visitLocation}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                    }
                    Text(
                        request.status.replace("_", " "),
                        color = statusColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${request.fromDate} → ${request.toDate}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                    if (request.totalDistanceKm != null) {
                        Text(
                            "${"%.1f".format(request.totalDistanceKm)} km",
                            color = CyanPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                // Action buttons
                if (request.status == "APPROVED") {
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = onStart,
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("START TRIP", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 12.sp)
                    }
                } else if (request.status == "IN_PROGRESS") {
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = onComplete,
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = OrangeAlert),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Stop, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("COMPLETE TRIP", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 12.sp)
                    }
                    Text(
                        "🔴 Location tracking active",
                        color = OrangeAlert,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
    }
}
