package com.monolith.crm.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.DarkBackground
import com.monolith.crm.ui.theme.DarkSurface
import com.monolith.crm.ui.theme.OnSurfaceVariant
import com.monolith.crm.ui.theme.OutlineColor
import com.monolith.crm.ui.theme.OrangeAlert
import com.monolith.crm.ui.viewmodel.AuthViewModel
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.PI

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    selectedModule: String,
    onModuleChanged: (String) -> Unit,
    onLoginSuccess: () -> Unit
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
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
                // Clean 3D rotating cube wireframe — no text overlay
                Rotating3DCube(
                    modifier = Modifier
                        .size(140.dp)
                        .padding(bottom = 12.dp)
                )

                Text(
                    text = "MONOLITH ENGINE",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "MOBILE CLIENT",
                    color = CyanPrimary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                // ── Module Selector ──
                Text(
                    "SELECT MODULE",
                    color = OnSurfaceVariant,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkBackground)
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ModuleTab(
                        label = "CRM",
                        isSelected = selectedModule == "CRM",
                        color = CyanPrimary,
                        modifier = Modifier.weight(1f),
                        onClick = { onModuleChanged("CRM") }
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    ModuleTab(
                        label = "HRMS",
                        isSelected = selectedModule == "HRMS",
                        color = OrangeAlert,
                        modifier = Modifier.weight(1f),
                        onClick = { onModuleChanged("HRMS") }
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = { Text("Corporate Email Address", color = OnSurfaceVariant) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = if (selectedModule == "CRM") CyanPrimary else OrangeAlert,
                        unfocusedBorderColor = OutlineColor
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = viewModel.password,
                    onValueChange = { viewModel.password = it },
                    label = { Text("Security Password", color = OnSurfaceVariant) },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = if (passwordVisible) "Hide password" else "Show password",
                                tint = OnSurfaceVariant
                            )
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = if (selectedModule == "CRM") CyanPrimary else OrangeAlert,
                        unfocusedBorderColor = OutlineColor
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Remember Me Option
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = viewModel.rememberMe,
                        onCheckedChange = { viewModel.rememberMe = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = if (selectedModule == "CRM") CyanPrimary else OrangeAlert,
                            uncheckedColor = OnSurfaceVariant,
                            checkmarkColor = DarkBackground
                        )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Remember Login Information",
                        color = OnSurfaceVariant,
                        fontSize = 12.sp
                    )
                }

                viewModel.errorMessage?.let {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = it, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(20.dp))

                if (viewModel.isLoading) {
                    CircularProgressIndicator(
                        color = if (selectedModule == "CRM") CyanPrimary else OrangeAlert
                    )
                } else {
                    Button(
                        onClick = { viewModel.login(selectedModule, onLoginSuccess) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selectedModule == "CRM") CyanPrimary else OrangeAlert
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "LOGIN TO ${selectedModule}",
                            color = DarkBackground,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ModuleTab(
    label: String,
    isSelected: Boolean,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val bgColor by animateColorAsState(
        if (isSelected) color else Color.Transparent,
        label = "tab_bg"
    )
    val textColor by animateColorAsState(
        if (isSelected) DarkBackground else OnSurfaceVariant,
        label = "tab_text"
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.sp
        )
    }
}

/**
 * Clean 3D rotating cube wireframe with dual-axis rotation,
 * pulsating vertex glow, and subtle scan line. No text overlay.
 */
@Composable
fun Rotating3DCube(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "cube_rotation")

    // Primary Y-axis rotation
    val angleY by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 10000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "cube_angle_y"
    )

    // Subtle X-axis tilt
    val angleX by infiniteTransition.animateFloat(
        initialValue = -15f,
        targetValue = 15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 6000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cube_angle_x"
    )

    // Vertex glow pulsation
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cube_glow"
    )

    // Scan line progress
    val scanProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cube_scan"
    )

    Canvas(modifier = modifier) {
        val centerX = size.width / 2
        val centerY = size.height / 2
        val scale = size.minDimension * 0.30f
        val radY = Math.toRadians(angleY.toDouble())
        val radX = Math.toRadians(angleX.toDouble())

        val cyanColor = CyanPrimary
        val orangeColor = Color(0xFFFB923C)

        // Cube vertices in 3D space (unit cube centered at origin)
        val cubeVertices = listOf(
            Triple(-0.7f, -0.7f, -0.7f), // 0: front-top-left
            Triple( 0.7f, -0.7f, -0.7f), // 1: front-top-right
            Triple( 0.7f,  0.7f, -0.7f), // 2: front-bottom-right
            Triple(-0.7f,  0.7f, -0.7f), // 3: front-bottom-left
            Triple(-0.7f, -0.7f,  0.7f), // 4: back-top-left
            Triple( 0.7f, -0.7f,  0.7f), // 5: back-top-right
            Triple( 0.7f,  0.7f,  0.7f), // 6: back-bottom-right
            Triple(-0.7f,  0.7f,  0.7f)  // 7: back-bottom-left
        )

        // 3D projection with dual-axis rotation
        fun project(x3d: Float, y3d: Float, z3d: Float): Offset {
            // Rotate around X axis (tilt)
            val y1 = y3d * cos(radX).toFloat() - z3d * sin(radX).toFloat()
            val z1 = y3d * sin(radX).toFloat() + z3d * cos(radX).toFloat()

            // Rotate around Y axis (spin)
            val x2 = x3d * cos(radY).toFloat() - z1 * sin(radY).toFloat()
            val z2 = x3d * sin(radY).toFloat() + z1 * cos(radY).toFloat()

            // Perspective projection
            val distance = 3.0f
            val factor = distance / (distance - z2)
            val sx = centerX + x2 * factor * scale
            val sy = centerY + y1 * factor * scale
            return Offset(sx, sy)
        }

        // Project all vertices
        val projected = cubeVertices.map { (x, y, z) -> project(x, y, z) }

        // Draw subtle grid lines
        drawLine(
            color = Color.White.copy(alpha = 0.05f),
            start = Offset(0f, centerY),
            end = Offset(size.width, centerY),
            strokeWidth = 0.5f
        )
        drawLine(
            color = Color.White.copy(alpha = 0.05f),
            start = Offset(centerX, 0f),
            end = Offset(centerX, size.height),
            strokeWidth = 0.5f
        )

        // Cube edges — 12 edges total
        val edges = listOf(
            // Front face
            0 to 1, 1 to 2, 2 to 3, 3 to 0,
            // Back face
            4 to 5, 5 to 6, 6 to 7, 7 to 4,
            // Connecting edges
            0 to 4, 1 to 5, 2 to 6, 3 to 7
        )

        // Draw edges with cyan glow
        for ((a, b) in edges) {
            // Outer glow
            drawLine(
                color = cyanColor.copy(alpha = 0.15f),
                start = projected[a],
                end = projected[b],
                strokeWidth = 6f
            )
            // Main line
            drawLine(
                color = cyanColor.copy(alpha = 0.85f),
                start = projected[a],
                end = projected[b],
                strokeWidth = 2f
            )
        }

        // Inner diagonal lines (subtle depth cue)
        val diagonals = listOf(0 to 6, 1 to 7, 2 to 4, 3 to 5)
        for ((a, b) in diagonals) {
            drawLine(
                color = orangeColor.copy(alpha = 0.12f),
                start = projected[a],
                end = projected[b],
                strokeWidth = 0.8f
            )
        }

        // Draw vertices with pulsating glow
        for (p in projected) {
            // Outer glow
            drawCircle(
                color = cyanColor.copy(alpha = glowAlpha * 0.4f),
                radius = 12f,
                center = p
            )
            // Mid glow
            drawCircle(
                color = cyanColor.copy(alpha = glowAlpha * 0.7f),
                radius = 6f,
                center = p
            )
            // Core dot
            drawCircle(
                color = cyanColor,
                radius = 3f,
                center = p
            )
        }

        // Subtle horizontal scan line
        val scanY = (centerY - scale * 1.2f) + (2.4f * scale * scanProgress)
        drawLine(
            color = orangeColor.copy(alpha = 0.25f),
            start = Offset(centerX - scale * 1.1f, scanY),
            end = Offset(centerX + scale * 1.1f, scanY),
            strokeWidth = 1.5f
        )
        // Glow for scan line
        drawLine(
            color = orangeColor.copy(alpha = 0.08f),
            start = Offset(centerX - scale * 1.1f, scanY),
            end = Offset(centerX + scale * 1.1f, scanY),
            strokeWidth = 5f
        )
    }
}
