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
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.monolith.crm.hrms.data.repository.HrmsRepository
import com.monolith.crm.hrms.face.FaceNetModel
import com.monolith.crm.ui.components.AppLogger
import com.monolith.crm.ui.theme.CyanPrimary
import com.monolith.crm.ui.theme.OrangeAlert
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

/**
 * Face enrollment screen - captures frontal face and enrolls.
 * Works with FaceNet TFLite for embedding, or liveness-only mode (ML Kit face detection).
 */
@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun FaceEnrollScreen(
    repository: HrmsRepository,
    faceNetModel: FaceNetModel?,
    onComplete: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)
    val scope = rememberCoroutineScope()

    // Handle back button
    BackHandler { onBack() }

    var faceDetected by remember { mutableStateOf(false) }
    var capturedEmbedding by remember { mutableStateOf<FloatArray?>(null) }
    var faceDetectedCount by remember { mutableIntStateOf(0) }
    var enrolling by remember { mutableStateOf(false) }
    var enrollmentDone by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var statusText by remember { mutableStateOf("Position your face in the circle") }
    var readyToEnroll by remember { mutableStateOf(false) }

    // Check existing enrollment status
    var alreadyEnrolled by remember { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(Unit) {
        val result = repository.getFaceEnrollmentStatus()
        alreadyEnrolled = result.getOrNull()?.enrolled
    }

    // Determine if FaceNet model is available
    val hasFaceNet = faceNetModel != null && faceNetModel.isReady()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("FACE ENROLLMENT", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Text(
                            if (hasFaceNet) "BIOMETRIC SETUP" else "LIVENESS VERIFICATION",
                            color = CyanPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp
                        )
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
                enrollmentDone -> {
                    // Success
                    Spacer(modifier = Modifier.weight(1f))
                    Box(
                        modifier = Modifier.size(100.dp).clip(CircleShape)
                            .background(Color(0xFF22C55E).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(56.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("FACE ENROLLED", color = Color(0xFF22C55E), fontSize = 20.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Your face has been securely enrolled. You can now check in/out using face verification.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onComplete,
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)
                    ) {
                        Text("RETURN TO DASHBOARD", fontWeight = FontWeight.Bold, color = Color.Black)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }

                alreadyEnrolled == true -> {
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(Icons.Default.VerifiedUser, null, tint = CyanPrimary, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("FACE ALREADY ENROLLED", color = CyanPrimary, fontSize = 18.sp, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Your face biometric is already registered. Contact HR admin to reset if needed.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)
                    ) {
                        Text("GO BACK", fontWeight = FontWeight.Bold, color = Color.Black)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }

                !cameraPermission.status.isGranted -> {
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(Icons.Default.CameraAlt, null, tint = CyanPrimary, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Camera Permission Required", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { cameraPermission.launchPermissionRequest() },
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary)
                    ) {
                        Text("GRANT ACCESS", fontWeight = FontWeight.Bold, color = Color.Black)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }

                enrolling -> {
                    Spacer(modifier = Modifier.weight(1f))
                    CircularProgressIndicator(color = CyanPrimary, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Encrypting and uploading face data...", color = Color.White, fontSize = 14.sp)
                    Spacer(modifier = Modifier.weight(1f))
                }

                else -> {
                    // Camera preview
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(statusText, color = if (faceDetected) CyanPrimary else OrangeAlert, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))

                    Box(
                        modifier = Modifier
                            .size(280.dp)
                            .clip(CircleShape)
                            .border(4.dp, if (faceDetected) CyanPrimary else OrangeAlert, CircleShape),
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
                                                if (!readyToEnroll) {
                                                    processEnrollFrame(imageProxy, faceNetModel) { detected, embedding ->
                                                        faceDetected = detected
                                                        if (detected) {
                                                            faceDetectedCount++
                                                            if (embedding != null) {
                                                                capturedEmbedding = embedding
                                                                readyToEnroll = true
                                                                statusText = "Face captured! Tap ENROLL to save."
                                                            } else if (faceDetectedCount >= 5) {
                                                                // After 5 consecutive detections without embedding, allow liveness-only enrollment
                                                                readyToEnroll = true
                                                                statusText = "Face verified! Tap ENROLL to save."
                                                            } else {
                                                                statusText = "Face detected. Hold steady... (${faceDetectedCount}/5)"
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

                    Button(
                        onClick = {
                            val embedding = capturedEmbedding
                            enrolling = true
                            scope.launch {
                                val result = repository.enrollFace(
                                    descriptor = embedding?.toList(),
                                    captureQuality = if (faceDetected) 0.95f else null,
                                    livenessDetected = true
                                )
                                enrolling = false
                                if (result.isSuccess) {
                                    enrollmentDone = true
                                } else {
                                    errorMessage = result.exceptionOrNull()?.message ?: "Enrollment failed"
                                }
                            }
                        },
                        enabled = readyToEnroll,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CyanPrimary,
                            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                        ),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Face, null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("ENROLL FACE", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 14.sp)
                    }

                    if (readyToEnroll) {
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = {
                            capturedEmbedding = null
                            faceDetected = false
                            readyToEnroll = false
                            faceDetectedCount = 0
                            statusText = "Position your face in the circle"
                        }) {
                            Text("RETAKE", color = OrangeAlert, fontWeight = FontWeight.Bold)
                        }
                    }

                    errorMessage?.let {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(it, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

@androidx.annotation.OptIn(ExperimentalGetImage::class)
private fun processEnrollFrame(
    imageProxy: ImageProxy,
    faceNetModel: FaceNetModel?,
    onResult: (detected: Boolean, embedding: FloatArray?) -> Unit
) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
        imageProxy.close()
        onResult(false, null)
        return
    }

    val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setMinFaceSize(0.3f)
        .build()

    FaceDetection.getClient(options).process(inputImage)
        .addOnSuccessListener { faces ->
            if (faces.isNotEmpty() && faceNetModel != null && faceNetModel.isReady()) {
                try {
                    val image = imageProxy.image!!
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
                    yuvImage.compressToJpeg(android.graphics.Rect(0, 0, image.width, image.height), 85, out)
                    val bitmap = BitmapFactory.decodeByteArray(out.toByteArray(), 0, out.size())

                    if (bitmap != null) {
                        val bounds = faces[0].boundingBox
                        val safeBounds = android.graphics.Rect(
                            maxOf(0, bounds.left), maxOf(0, bounds.top),
                            minOf(bitmap.width, bounds.right), minOf(bitmap.height, bounds.bottom)
                        )
                        if (safeBounds.width() > 0 && safeBounds.height() > 0) {
                            val faceBitmap = Bitmap.createBitmap(
                                bitmap, safeBounds.left, safeBounds.top, safeBounds.width(), safeBounds.height()
                            )
                            val embedding = faceNetModel.generateEmbedding(faceBitmap)
                            onResult(true, embedding)
                        } else {
                            onResult(true, null)
                        }
                    } else {
                        onResult(true, null)
                    }
                } catch (e: Exception) {
                    onResult(true, null)
                }
            } else if (faces.isNotEmpty()) {
                // Face detected but no FaceNet model - liveness-only mode
                onResult(true, null)
            } else {
                onResult(false, null)
            }
            imageProxy.close()
        }
        .addOnFailureListener {
            onResult(false, null)
            imageProxy.close()
        }
}
