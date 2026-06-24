package com.monolith.crm.hrms.face

import android.content.Context
import android.graphics.Bitmap
import com.monolith.crm.ui.components.AppLogger
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.sqrt

/**
 * FaceNet TFLite model wrapper.
 *
 * Loads a FaceNet MobileNet v2 model from app assets and generates 128-d
 * face embeddings. Provides Euclidean distance comparison for verification.
 *
 * Model input: 160×160×3 float image
 * Model output: 128-d float embedding
 *
 * Threshold: 0.6 (same as server-side face-enrollment.ts)
 */
class FaceNetModel(private val context: Context) {

    companion object {
        private const val MODEL_FILE = "facenet.tflite"
        private const val INPUT_SIZE = 160
        private const val EMBEDDING_SIZE = 128
        const val VERIFICATION_THRESHOLD = 0.6f
        private const val TAG = "FaceNet"
    }

    private var interpreter: Interpreter? = null
    private var isLoaded = false

    /**
     * Load the TFLite model. Call this once at startup.
     * Returns false if the model file is not bundled.
     */
    fun loadModel(): Boolean {
        return try {
            val modelBuffer = loadModelFile()
            if (modelBuffer == null) {
                AppLogger.warn(TAG, "FaceNet model not found in assets. Face verification will use server-only mode.")
                isLoaded = false
                return false
            }
            val options = Interpreter.Options().apply {
                setNumThreads(4)
            }
            interpreter = Interpreter(modelBuffer, options)
            isLoaded = true
            AppLogger.info(TAG, "FaceNet model loaded successfully")
            true
        } catch (e: Exception) {
            AppLogger.error(TAG, "Failed to load FaceNet model: ${e.message}", e)
            isLoaded = false
            false
        }
    }

    /**
     * Check if the model is loaded and ready for inference.
     */
    fun isReady(): Boolean = isLoaded && interpreter != null

    /**
     * Generate a 128-d face embedding from a cropped face bitmap.
     * The bitmap should be a tightly cropped face image.
     *
     * @param faceBitmap Cropped face bitmap (any size, will be resized to 160×160)
     * @return FloatArray of 128 dimensions, or null on failure
     */
    fun generateEmbedding(faceBitmap: Bitmap): FloatArray? {
        if (!isReady()) {
            AppLogger.warn(TAG, "Model not loaded, cannot generate embedding")
            return null
        }

        return try {
            // Resize to 160×160
            val resized = Bitmap.createScaledBitmap(faceBitmap, INPUT_SIZE, INPUT_SIZE, true)

            // Preprocess: convert to float array with normalization [-1, 1]
            val inputBuffer = preprocessBitmap(resized)

            // Allocate output buffer
            val outputArray = Array(1) { FloatArray(EMBEDDING_SIZE) }

            // Run inference
            interpreter?.run(inputBuffer, outputArray)

            // L2 normalize the embedding
            val embedding = outputArray[0]
            l2Normalize(embedding)

            AppLogger.info(TAG, "Embedding generated: ${embedding.size} dimensions")
            embedding
        } catch (e: Exception) {
            AppLogger.error(TAG, "Embedding generation failed: ${e.message}", e)
            null
        }
    }

    /**
     * Compare two face embeddings using Euclidean distance.
     * Lower distance = more similar faces.
     *
     * @return Pair of (distance, isMatch) where isMatch = distance < threshold
     */
    fun compareEmbeddings(embedding1: FloatArray, embedding2: FloatArray): Pair<Float, Boolean> {
        val distance = euclideanDistance(embedding1, embedding2)
        val isMatch = distance < VERIFICATION_THRESHOLD
        AppLogger.info(TAG, "Face comparison: distance=${"%.4f".format(distance)}, match=$isMatch (threshold=$VERIFICATION_THRESHOLD)")
        return Pair(distance, isMatch)
    }

    /**
     * Compute Euclidean distance between two embedding vectors.
     */
    private fun euclideanDistance(a: FloatArray, b: FloatArray): Float {
        require(a.size == b.size) { "Embedding dimensions must match" }
        var sum = 0.0f
        for (i in a.indices) {
            val diff = a[i] - b[i]
            sum += diff * diff
        }
        return sqrt(sum)
    }

    /**
     * L2 normalize a vector in-place.
     */
    private fun l2Normalize(vector: FloatArray) {
        var norm = 0.0f
        for (v in vector) norm += v * v
        norm = sqrt(norm)
        if (norm > 0) {
            for (i in vector.indices) vector[i] /= norm
        }
    }

    /**
     * Convert a 160×160 bitmap to a ByteBuffer suitable for TFLite input.
     * Normalizes pixel values from [0, 255] to [-1, 1].
     */
    private fun preprocessBitmap(bitmap: Bitmap): ByteBuffer {
        val byteBuffer = ByteBuffer.allocateDirect(4 * INPUT_SIZE * INPUT_SIZE * 3)
        byteBuffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

        for (pixel in pixels) {
            // Extract RGB and normalize to [-1, 1]
            val r = ((pixel shr 16) and 0xFF) / 127.5f - 1.0f
            val g = ((pixel shr 8) and 0xFF) / 127.5f - 1.0f
            val b = (pixel and 0xFF) / 127.5f - 1.0f
            byteBuffer.putFloat(r)
            byteBuffer.putFloat(g)
            byteBuffer.putFloat(b)
        }

        return byteBuffer
    }

    /**
     * Load TFLite model from assets directory.
     */
    private fun loadModelFile(): MappedByteBuffer? {
        return try {
            val assetManager = context.assets
            val fileDescriptor = assetManager.openFd(MODEL_FILE)
            val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
            val fileChannel = inputStream.channel
            val startOffset = fileDescriptor.startOffset
            val declaredLength = fileDescriptor.declaredLength
            fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
        } catch (e: Exception) {
            // Model file not found — server-only mode
            null
        }
    }

    /**
     * Release model resources.
     */
    fun close() {
        interpreter?.close()
        interpreter = null
        isLoaded = false
    }
}
