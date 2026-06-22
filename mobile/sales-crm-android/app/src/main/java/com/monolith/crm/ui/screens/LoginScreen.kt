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
import androidx.compose.ui.graphics.graphicsLayer
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

    // Gentle floating card animation
    val infiniteTransition = rememberInfiniteTransition(label = "card_floating")
    val cardYOffset by infiniteTransition.animateFloat(
        initialValue = -6f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "card_offset"
    )

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
            modifier = Modifier
                .fillMaxWidth()
                .graphicsLayer {
                    translationY = cardYOffset.dp.toPx()
                }
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // 3D rotating prism logo
                Rotating3DPrism(
                    modifier = Modifier
                        .size(110.dp)
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
    val angle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 7000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "prism_angle"
    )

    Canvas(modifier = modifier) {
        val centerX = size.width / 2
        val centerY = size.height / 2
        val scale = size.minDimension * 0.4f
        val rad = Math.toRadians(angle.toDouble())

        // Top triangle (y = -0.7) and Bottom triangle (y = 0.7)
        val yTop = -0.7f
        val yBottom = 0.7f

        // Angle offsets for triangular faces (120 degrees apart)
        val alpha0 = 0.0
        val alpha1 = 2.0 * PI / 3.0
        val alpha2 = 4.0 * PI / 3.0

        val r = 0.9f // radius in 3D

        fun project(x3d: Float, y3d: Float, z3d: Float): androidx.compose.ui.geometry.Offset {
            // Rotate around Y axis
            val xr = x3d * cos(rad) - z3d * sin(rad)
            val yr = y3d
            val zr = x3d * sin(rad) + z3d * cos(rad)

            // Perspective division
            val distance = 2.5f
            val factor = distance / (distance - zr)
            val sx = centerX + xr * factor * scale
            val sy = centerY + yr * factor * scale
            return androidx.compose.ui.geometry.Offset(sx.toFloat(), sy.toFloat())
        }

        // Top face points
        val p0 = project((r * cos(alpha0)).toFloat(), yTop, (r * sin(alpha0)).toFloat())
        val p1 = project((r * cos(alpha1)).toFloat(), yTop, (r * sin(alpha1)).toFloat())
        val p2 = project((r * cos(alpha2)).toFloat(), yTop, (r * sin(alpha2)).toFloat())

        // Bottom face points
        val p3 = project((r * cos(alpha0)).toFloat(), yBottom, (r * sin(alpha0)).toFloat())
        val p4 = project((r * cos(alpha1)).toFloat(), yBottom, (r * sin(alpha1)).toFloat())
        val p5 = project((r * cos(alpha2)).toFloat(), yBottom, (r * sin(alpha2)).toFloat())

        val cyanColor = CyanPrimary
        val orangeColor = Color(0xFFFB923C)

        // Draw top face wireframe
        drawLine(cyanColor, p0, p1, strokeWidth = 3f)
        drawLine(cyanColor, p1, p2, strokeWidth = 3f)
        drawLine(cyanColor, p2, p0, strokeWidth = 3f)

        // Draw bottom face wireframe
        drawLine(cyanColor, p3, p4, strokeWidth = 3f)
        drawLine(cyanColor, p4, p5, strokeWidth = 3f)
        drawLine(cyanColor, p5, p3, strokeWidth = 3f)

        // Draw vertical columns
        drawLine(cyanColor, p0, p3, strokeWidth = 3f)
        drawLine(cyanColor, p1, p4, strokeWidth = 3f)
        drawLine(cyanColor, p2, p5, strokeWidth = 3f)

        // Subtle orange wireframes inside for visual flare
        drawLine(orangeColor.copy(alpha = 0.35f), p0, p4, strokeWidth = 1.5f)
        drawLine(orangeColor.copy(alpha = 0.35f), p1, p5, strokeWidth = 1.5f)
        drawLine(orangeColor.copy(alpha = 0.35f), p2, p3, strokeWidth = 1.5f)
    }
}
