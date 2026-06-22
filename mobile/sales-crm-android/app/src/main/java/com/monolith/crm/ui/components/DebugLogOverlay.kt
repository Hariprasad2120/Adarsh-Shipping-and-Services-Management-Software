package com.monolith.crm.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.CrmApp
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import kotlin.math.roundToInt

/**
 * Floating debug logger overlay.
 * Shows a warning FAB that can be dragged anywhere on screen.
 * When tapped, expands to show a scrollable log panel.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DebugLogOverlay(repository: CrmRepository? = null) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val repo = repository ?: remember {
        (context.applicationContext as? CrmApp)?.repository
    }
    var isExpanded by remember { mutableStateOf(false) }
    val logs = AppLogger.logs
    val errorCount = AppLogger.errorCount
    val warnCount = AppLogger.warnCount
    val totalIssues = errorCount + warnCount

    // Draggable offset state for the FAB
    var offsetX by remember { mutableStateOf(0f) }
    var offsetY by remember { mutableStateOf(0f) }

    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        // Expanded log panel
        AnimatedVisibility(
            visible = isExpanded,
            enter = slideInVertically(initialOffsetY = { it }),
            exit = slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0A0F14)),
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f)
            ) {
                Column {
                    // Header bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF1A1F26))
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = Color(0xFFFB923C),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "DEBUG LOG",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            if (errorCount > 0) {
                                Badge(containerColor = Color.Red) {
                                    Text("$errorCount", fontSize = 9.sp, color = Color.White)
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                            }
                            if (warnCount > 0) {
                                Badge(containerColor = Color(0xFFFB923C)) {
                                    Text("$warnCount", fontSize = 9.sp, color = Color.Black)
                                }
                            }
                        }
                        Row {
                            IconButton(onClick = { AppLogger.clear() }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Delete, contentDescription = "Clear", tint = OnSurfaceVariant, modifier = Modifier.size(16.dp))
                            }
                            IconButton(onClick = { isExpanded = false }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = OnSurfaceVariant, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    // Server URL Configuration inside Debug Menu
                    repo?.let { r ->
                        var localBaseUrl by remember { mutableStateOf(r.getBaseUrl()) }
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF161B22))
                                .padding(12.dp)
                        ) {
                            Text(
                                "SERVER URL CONFIGURATION",
                                color = CyanPrimary,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                OutlinedTextField(
                                    value = localBaseUrl,
                                    onValueChange = { localBaseUrl = it },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = CyanPrimary,
                                        unfocusedBorderColor = Color.Gray,
                                        cursorColor = CyanPrimary
                                    ),
                                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 11.sp),
                                    singleLine = true,
                                    modifier = Modifier.weight(1f)
                                )
                                Button(
                                    onClick = {
                                        r.setBaseUrl(localBaseUrl)
                                        AppLogger.info("Debug", "Server URL updated manually to $localBaseUrl")
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text("SAVE", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Log entries
                    if (logs.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No log entries yet", color = OnSurfaceVariant, fontSize = 12.sp)
                        }
                    } else {
                        val listState = rememberLazyListState()
                        LaunchedEffect(logs.size) {
                            if (logs.isNotEmpty()) {
                                listState.animateScrollToItem(logs.size - 1)
                            }
                        }
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            items(logs) { entry ->
                                LogEntryCard(entry)
                            }
                        }
                    }
                }
            }
        }

        // Floating warning button — DRAGGABLE (always visible when not expanded)
        if (!isExpanded) {
            Box(
                modifier = Modifier
                    .offset { IntOffset(offsetX.roundToInt(), offsetY.roundToInt()) }
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .padding(top = 72.dp)
                    .pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            offsetX += dragAmount.x
                            offsetY += dragAmount.y
                        }
                    }
            ) {
                FloatingActionButton(
                    onClick = { isExpanded = true },
                    containerColor = if (errorCount > 0) Color.Red.copy(alpha = 0.9f)
                        else if (warnCount > 0) Color(0xFFFB923C).copy(alpha = 0.9f)
                        else DarkSurface.copy(alpha = 0.9f),
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = "View Debug Logs",
                        modifier = Modifier.size(22.dp)
                    )
                }
                // Badge count
                if (totalIssues > 0) {
                    Badge(
                        containerColor = Color.Red,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 4.dp, y = (-4).dp)
                    ) {
                        Text(
                            "$totalIssues",
                            fontSize = 9.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LogEntryCard(entry: AppLogger.LogEntry) {
    var showDetails by remember { mutableStateOf(false) }
    val levelColor = when (entry.level) {
        AppLogger.Level.ERROR -> Color.Red
        AppLogger.Level.WARN -> Color(0xFFFB923C)
        AppLogger.Level.INFO -> CyanPrimary
    }
    val levelLabel = when (entry.level) {
        AppLogger.Level.ERROR -> "ERR"
        AppLogger.Level.WARN -> "WRN"
        AppLogger.Level.INFO -> "INF"
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFF12171D))
            .clickable(enabled = entry.details != null) { showDetails = !showDetails }
            .padding(8.dp)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            // Level badge
            Text(
                text = levelLabel,
                color = levelColor,
                fontSize = 8.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.5.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(3.dp))
                    .background(levelColor.copy(alpha = 0.15f))
                    .padding(horizontal = 4.dp, vertical = 1.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            // Timestamp
            Text(
                text = entry.timestamp,
                color = OnSurfaceVariant.copy(alpha = 0.6f),
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace
            )
            Spacer(modifier = Modifier.width(6.dp))
            // Tag
            Text(
                text = entry.tag,
                color = CyanPrimary.copy(alpha = 0.7f),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold
            )
        }
        // Message
        Text(
            text = entry.message,
            color = Color.White.copy(alpha = 0.9f),
            fontSize = 11.sp,
            maxLines = if (showDetails) Int.MAX_VALUE else 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 3.dp)
        )
        // Expandable details
        if (showDetails && entry.details != null) {
            Text(
                text = entry.details,
                color = OnSurfaceVariant.copy(alpha = 0.7f),
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace,
                lineHeight = 13.sp,
                modifier = Modifier
                    .padding(top = 4.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFF080C10))
                    .padding(6.dp)
            )
        }
    }
}
