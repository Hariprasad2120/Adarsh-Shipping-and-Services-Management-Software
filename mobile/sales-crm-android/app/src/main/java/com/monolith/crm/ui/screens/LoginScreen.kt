package com.monolith.crm.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
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
import com.monolith.crm.ui.viewmodel.AuthViewModel
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.PI

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
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
                // Cool 3D Executable code style Prism Logo
                Rotating3DPrism(
                    modifier = Modifier
                        .size(140.dp)
                        .padding(bottom = 12.dp)
                )

                Text(
                    text = "MONOLITH ENGINE CRM",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "SALES FORCE CLIENT",
                    color = CyanPrimary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = { Text("Corporate Email Address", color = OnSurfaceVariant) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = CyanPrimary,
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
                        focusedBorderColor = CyanPrimary,
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
                            checkedColor = CyanPrimary,
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
                    CircularProgressIndicator(color = CyanPrimary)
                } else {
                    Button(
                        onClick = { viewModel.login(onLoginSuccess) },
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("LOGIN TO WORKSPACE", color = DarkBackground, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun Rotating3DPrism(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "prism_rotation")
    
    // Constant rotation angle
    val angle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "prism_angle"
    )

    // Laser scanning line progress
    val scanProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3500, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "prism_scan"
    )

    // Setup Text Paint for real-time overlay metrics
    val paintText = remember {
        android.graphics.Paint().apply {
            color = android.graphics.Color.parseColor("#00cec4")
            textSize = 20f
            typeface = android.graphics.Typeface.MONOSPACE
            alpha = 180
            isAntiAlias = true
        }
    }

    val orangePaintText = remember {
        android.graphics.Paint().apply {
            color = android.graphics.Color.parseColor("#fb923c")
            textSize = 16f
            typeface = android.graphics.Typeface.MONOSPACE
            alpha = 140
            isAntiAlias = true
        }
    }

    Canvas(modifier = modifier) {
        val centerX = size.width / 2
        val centerY = size.height / 2
        val scale = size.minDimension * 0.35f
        val rad = Math.toRadians(angle.toDouble())

        // Top triangle (y = -0.7) and Bottom triangle (y = 0.7)
        val yTop = -0.7f
        val yBottom = 0.7f

        // Angle offsets for triangular faces (120 degrees apart)
        val alpha0 = 0.0
        val alpha1 = 2.0 * PI / 3.0
        val alpha2 = 4.0 * PI / 3.0

        val r = 0.85f // radius in 3D space

        // 3D rotated point projection helper
        fun project(x3d: Float, y3d: Float, z3d: Float): androidx.compose.ui.geometry.Offset {
            // Rotate around Y axis
            val xr = x3d * cos(rad) - z3d * sin(rad)
            val yr = y3d
            val zr = x3d * sin(rad) + z3d * cos(rad)

            // Perspective division
            val distance = 2.4f
            val factor = distance / (distance - zr)
            val sx = centerX + xr * factor * scale
            val sy = centerY + yr * factor * scale
            return androidx.compose.ui.geometry.Offset(sx.toFloat(), sy.toFloat())
        }

        // Draw Coordinate Grid Lines (Axes)
        drawLine(
            color = Color.White.copy(alpha = 0.1f),
            start = androidx.compose.ui.geometry.Offset(0f, centerY),
            end = androidx.compose.ui.geometry.Offset(size.width, centerY),
            strokeWidth = 1f
        )
        drawLine(
            color = Color.White.copy(alpha = 0.1f),
            start = androidx.compose.ui.geometry.Offset(centerX, 0f),
            end = androidx.compose.ui.geometry.Offset(centerX, size.height),
            strokeWidth = 1f
        )

        // Project top face points
        val p0 = project((r * cos(alpha0)).toFloat(), yTop, (r * sin(alpha0)).toFloat())
        val p1 = project((r * cos(alpha1)).toFloat(), yTop, (r * sin(alpha1)).toFloat())
        val p2 = project((r * cos(alpha2)).toFloat(), yTop, (r * sin(alpha2)).toFloat())

        // Project bottom face points
        val p3 = project((r * cos(alpha0)).toFloat(), yBottom, (r * sin(alpha0)).toFloat())
        val p4 = project((r * cos(alpha1)).toFloat(), yBottom, (r * sin(alpha1)).toFloat())
        val p5 = project((r * cos(alpha2)).toFloat(), yBottom, (r * sin(alpha2)).toFloat())

        val cyanColor = CyanPrimary
        val orangeColor = Color(0xFFFB923C)

        // Draw top face wireframe
        drawLine(cyanColor.copy(alpha = 0.8f), p0, p1, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p1, p2, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p2, p0, strokeWidth = 2.5f)

        // Draw bottom face wireframe
        drawLine(cyanColor.copy(alpha = 0.8f), p3, p4, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p4, p5, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p5, p3, strokeWidth = 2.5f)

        // Draw vertical columns
        drawLine(cyanColor.copy(alpha = 0.8f), p0, p3, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p1, p4, strokeWidth = 2.5f)
        drawLine(cyanColor.copy(alpha = 0.8f), p2, p5, strokeWidth = 2.5f)

        // Dynamic diag wireframe lines (Orange alert colors)
        drawLine(orangeColor.copy(alpha = 0.3f), p0, p4, strokeWidth = 1f)
        drawLine(orangeColor.copy(alpha = 0.3f), p1, p5, strokeWidth = 1f)
        drawLine(orangeColor.copy(alpha = 0.3f), p2, p3, strokeWidth = 1f)

        // Draw glowing vertex points
        val vertices = listOf(p0, p1, p2, p3, p4, p5)
        for (p in vertices) {
            drawCircle(cyanColor, radius = 5f, center = p)
            drawCircle(cyanColor.copy(alpha = 0.3f), radius = 10f, center = p)
        }

        // Draw dynamic laser scanning line
        val scanY = (centerY - scale) + (2 * scale * scanProgress)
        drawLine(
            color = orangeColor.copy(alpha = 0.6f),
            start = androidx.compose.ui.geometry.Offset(centerX - scale * 1.3f, scanY),
            end = androidx.compose.ui.geometry.Offset(centerX + scale * 1.3f, scanY),
            strokeWidth = 2f
        )
        // Subtler glow for scan line
        drawLine(
            color = orangeColor.copy(alpha = 0.2f),
            start = androidx.compose.ui.geometry.Offset(centerX - scale * 1.3f, scanY),
            end = androidx.compose.ui.geometry.Offset(centerX + scale * 1.3f, scanY),
            strokeWidth = 6f
        )

        // Render real-time overlay vector code & values
        drawContext.canvas.nativeCanvas.apply {
            drawText("MONOLITH.EXE", 12f, 24f, paintText)
            drawText("DEG: ${angle.toInt()}°", 12f, 48f, paintText)
            
            // Render mock running algorithm vectors
            drawText("V_X: ${(cos(rad) * r).toString().take(5)}", 12f, size.height - 36f, orangePaintText)
            drawText("V_Z: ${(sin(rad) * r).toString().take(5)}", 12f, size.height - 18f, orangePaintText)
            
            drawText("STATE: PLOTTING_3D", size.width - 200f, 24f, paintText)
            drawText("RATE: 60FPS", size.width - 120f, 48f, orangePaintText)
        }
    }
}
