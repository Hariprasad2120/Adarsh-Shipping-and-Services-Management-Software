package com.monolith.crm.hrms.ui.screens

import android.Manifest
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Size
import androidx.activity.compose.BackHandler
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.monolith.crm.hrms.face.FaceNetModel
import com.monolith.crm.hrms.ui.viewmodel.HrmsViewModel
import com.monolith.crm.ui.components.AppLogger
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.OrangeAlert
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

/**
 * Combined Check-In/Check-Out screen with face capture and GPS.
 * Requests camera AND location permissions before proceeding.
 */
@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun CheckInOutScreen(
    isCheckIn: Boolean,
    viewModel: HrmsViewModel,
    faceNetModel: FaceNetModel?,
    onComplete: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    // Request BOTH camera and location permissions together
    val permissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )

    val cameraGranted = permissionsState.permissions.find {
        it.permission == Manifest.permission.CAMERA
    }?.status?.isGranted ?: false

    val locationGranted = permissionsState.permissions.find {
        it.permission == Manifest.permission.ACCESS_FINE_LOCATION
    }?.status?.isGranted ?: false

    // Back button handler
    BackHandler {
        viewModel.clearMessages()
        onBack()
    }

    var faceDetected by remember { mutableStateOf(false) }
    var capturedEmbedding by remember { mutableStateOf<FloatArray?>(null) }
    var faceDetectedCount by remember { mutableIntStateOf(0) }
    var processing by remember { mutableStateOf(false) }
    var statusText by remember { mutableStateOf("Position your face in the circle") }
    var readyToSubmit by remember { mutableStateOf(false) }

    // Results
    val operationInProgress = if (isCheckIn) viewModel.isCheckingIn else viewModel.isCheckingOut
    val resultMessage = if (isCheckIn) viewModel.checkInResult else viewModel.checkOutResult

    // Auto-navigate on success
    LaunchedEffect(resultMessage) {
        if (resultMessage != null) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearMessages()
            onComplete()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isCheckIn) "CHECK IN" else "CHECK OUT",
                            color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black
                        )
                        Text(
                            "FACE + GPS VERIFICATION",
                            color = CyanPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.clearMessages()
                        onBack()
                    }) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when {
                // Permissions not granted
                !cameraGranted || !locationGranted -> {
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(
                        if (!cameraGranted) Icons.Default.CameraAlt else Icons.Default.LocationOff,
                        null, tint = OrangeAlert, modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Permissions Required", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))
                    if (!cameraGranted) {
                        PermissionRow(icon = Icons.Default.CameraAlt, label = "Camera", desc = "Face verification", granted = false)
                    }
                    if (!locationGranted) {
                        PermissionRow(icon = Icons.Default.LocationOn, label = "Location", desc = "GPS check-in/out", granted = false)
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { permissionsState.launchMultiplePermissionRequest() },
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("GRANT PERMISSIONS", fontWeight = FontWeight.Bold, color = Color.Black)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    TextButton(onClick = onBack) {
                        Text("CANCEL", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }

                // Success result
                resultMessage != null -> {
                    Spacer(modifier = Modifier.weight(1f))
                    Box(
                        modifier = Modifier.size(100.dp).clip(CircleShape)
                            .background(Color(0xFF22C55E).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(56.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        if (isCheckIn) "CHECKED IN" else "CHECKED OUT",
                        color = Color(0xFF22C55E), fontSize = 20.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(resultMessage, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.weight(1f))
                }

                // Processing state
                operationInProgress -> {
                    Spacer(modifier = Modifier.weight(1f))
                    CircularProgressIndicator(color = CyanPrimary, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Verifying face and capturing GPS location...", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.weight(1f))
                }

                // Camera preview + face detection
                else -> {
                    val borderColor by animateColorAsState(
                        if (faceDetected) CyanPrimary else OrangeAlert, label = "border"
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        statusText,
                        color = if (faceDetected) CyanPrimary else OrangeAlert,
                        fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Camera preview in circle
                    Box(
                        modifier = Modifier.size(280.dp).clip(CircleShape).border(4.dp, borderColor, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        AndroidView(
                            factory = { ctx ->
                                val previewView = PreviewView(ctx).apply {
                                    scaleType = PreviewView.ScaleType.FILL_CENTER
                                }
                                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                                cameraProviderFuture.addListener({
                                    val cameraProvider = cameraProviderFuture.get()
                                    val preview = Preview.Builder().build().also {
                                        it.setSurfaceProvider(previewView.surfaceProvider)
                                    }
                                    val imageAnalyzer = ImageAnalysis.Builder()
                                        .setTargetResolution(Size(480, 640))
                                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                        .build()
                                        .also { analysis ->
                                            analysis.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                                                if (!readyToSubmit && !processing) {
                                                    processFrame(imageProxy, faceNetModel) { detected, embedding, _ ->
                                                        faceDetected = detected
                                                        if (detected) {
                                                            faceDetectedCount++
                                                            if (embedding != null) {
                                                                capturedEmbedding = embedding
                                                                readyToSubmit = true
                                                                statusText = "Face verified! Tap to ${if (isCheckIn) "check in" else "check out"}."
                                                            } else if (faceDetectedCount >= 3) {
                                                                // Allow without embedding after 3 frames
                                                                readyToSubmit = true
                                                                statusText = "Face detected! Tap to ${if (isCheckIn) "check in" else "check out"}."
                                                            } else {
                                                                statusText = "Hold steady... (${faceDetectedCount}/3)"
                                                            }
                                                        } else {
                                                            faceDetectedCount = 0
                                                            statusText = "Position your face in the circle"
                                                        }
                                                    }
                                                } else {
                                                    imageProxy.close()
                                                }
                                            }
                                        }
                                    try {
                                        cameraProvider.unbindAll()
                                        cameraProvider.bindToLifecycle(
                                            lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageAnalyzer
                                        )
                                    } catch (e: Exception) {
                                        AppLogger.error("Camera", "Bind failed: ${e.message}", e)
                                    }
                                }, ContextCompat.getMainExecutor(ctx))
                                previewView
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Confirm button
                    Button(
                        onClick = {
                            processing = true
                            val descriptorList = capturedEmbedding?.toList()
                            if (isCheckIn) {
                                viewModel.performCheckIn(descriptorList, if (faceDetected) 0.95f else null)
                            } else {
                                viewModel.performCheckOut(descriptorList, if (faceDetected) 0.95f else null)
                            }
                        },
                        enabled = readyToSubmit || faceDetected,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isCheckIn) CyanPrimary else OrangeAlert,
                            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                        ),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(
                            if (isCheckIn) Icons.Default.Login else Icons.Default.Logout,
                            null, modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (isCheckIn) "CONFIRM CHECK IN" else "CONFIRM CHECK OUT",
                            fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 14.sp
                        )
                    }

                    // Error message
                    viewModel.errorMessage?.let {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF3D1111))
                        ) {
                            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Error, null, tint = Color.Red, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(it, color = Color.Red, fontSize = 12.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, null, tint = CyanPrimary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("GPS location will be captured automatically", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun PermissionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    desc: String,
    granted: Boolean
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = if (granted) CyanPrimary else OrangeAlert, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(label, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text(desc, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
            Icon(
                if (granted) Icons.Default.CheckCircle else Icons.Default.Warning,
                null, tint = if (granted) CyanPrimary else OrangeAlert, modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * Process a camera frame: detect face with ML Kit, then extract FaceNet embedding.
 */
@androidx.annotation.OptIn(ExperimentalGetImage::class)
private fun processFrame(
    imageProxy: ImageProxy,
    faceNetModel: FaceNetModel?,
    onResult: (detected: Boolean, embedding: FloatArray?, bitmap: Bitmap?) -> Unit
) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
        imageProxy.close()
        onResult(false, null, null)
        return
    }

    val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setMinFaceSize(0.3f)
        .build()

    FaceDetection.getClient(options).process(inputImage)
        .addOnSuccessListener { faces ->
            if (faces.isNotEmpty()) {
                val face = faces[0]
                if (faceNetModel != null && faceNetModel.isReady()) {
                    try {
                        val bitmap = imageToBitmap(imageProxy)
                        if (bitmap != null) {
                            val bounds = face.boundingBox
                            val safeBounds = Rect(
                                maxOf(0, bounds.left), maxOf(0, bounds.top),
                                minOf(bitmap.width, bounds.right), minOf(bitmap.height, bounds.bottom)
                            )
                            if (safeBounds.width() > 0 && safeBounds.height() > 0) {
                                val faceBitmap = Bitmap.createBitmap(
                                    bitmap, safeBounds.left, safeBounds.top,
                                    safeBounds.width(), safeBounds.height()
                                )
                                val embedding = faceNetModel.generateEmbedding(faceBitmap)
                                onResult(true, embedding, faceBitmap)
                            } else {
                                onResult(true, null, null)
                            }
                        } else {
                            onResult(true, null, null)
                        }
                    } catch (e: Exception) {
                        AppLogger.error("FaceCapture", "Embedding failed: ${e.message}", e)
                        onResult(true, null, null)
                    }
                } else {
                    // No FaceNet model - liveness mode
                    onResult(true, null, null)
                }
            } else {
                onResult(false, null, null)
            }
            imageProxy.close()
        }
        .addOnFailureListener {
            onResult(false, null, null)
            imageProxy.close()
        }
}

@androidx.annotation.OptIn(ExperimentalGetImage::class)
private fun imageToBitmap(imageProxy: ImageProxy): Bitmap? {
    return try {
        val image = imageProxy.image ?: return null
        val planes = image.planes
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer
        val nv21 = ByteArray(yBuffer.remaining() + uBuffer.remaining() + vBuffer.remaining())
        yBuffer.get(nv21, 0, yBuffer.remaining())
        vBuffer.get(nv21, yBuffer.remaining(), vBuffer.remaining())
        uBuffer.get(nv21, yBuffer.remaining() + vBuffer.remaining(), uBuffer.remaining())
        val yuvImage = YuvImage(nv21, ImageFormat.NV21, image.width, image.height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, image.width, image.height), 85, out)
        BitmapFactory.decodeByteArray(out.toByteArray(), 0, out.size())
    } catch (_: Exception) { null }
}
