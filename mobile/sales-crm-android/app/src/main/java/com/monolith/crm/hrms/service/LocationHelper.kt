package com.monolith.crm.hrms.service

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.google.android.gms.tasks.CancellationTokenSource
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.math.*

/**
 * Utility class for GPS location operations.
 */
object LocationHelper {

    private const val TAG = "LocationHelper"
    private const val EARTH_RADIUS_KM = 6371.0

    /**
     * Get a single GPS fix with high accuracy.
     * Returns null if location permission is not granted or location unavailable.
     */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(context: Context): Location? {
        if (!hasLocationPermission(context)) {
            AppLogger.warn(TAG, "Location permission not granted")
            return null
        }

        val fusedClient = LocationServices.getFusedLocationProviderClient(context)

        return try {
            suspendCancellableCoroutine { continuation ->
                val cts = CancellationTokenSource()

                fusedClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cts.token
                ).addOnSuccessListener { location ->
                    if (location != null) {
                        AppLogger.info(TAG, "Got location: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}m")
                        continuation.resume(location)
                    } else {
                        // Try last known location as fallback
                        fusedClient.lastLocation.addOnSuccessListener { lastLocation ->
                            if (lastLocation != null) {
                                AppLogger.info(TAG, "Using last known location: lat=${lastLocation.latitude}, lng=${lastLocation.longitude}")
                                continuation.resume(lastLocation)
                            } else {
                                AppLogger.warn(TAG, "No location available")
                                continuation.resume(null)
                            }
                        }.addOnFailureListener {
                            continuation.resume(null)
                        }
                    }
                }.addOnFailureListener { e ->
                    AppLogger.error(TAG, "Location request failed: ${e.message}", e)
                    continuation.resume(null)
                }

                continuation.invokeOnCancellation {
                    cts.cancel()
                }
            }
        } catch (e: Exception) {
            AppLogger.error(TAG, "getCurrentLocation error: ${e.message}", e)
            null
        }
    }

    /**
     * Check if the location is from a mock provider.
     */
    fun isMockLocation(location: Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }
    }

    /**
     * Check if fine location permission is granted.
     */
    fun hasLocationPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if background location permission is granted.
     */
    fun hasBackgroundLocationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Background location not needed pre-Q
        }
    }

    /**
     * Start the location tracking foreground service.
     */
    fun startWorkingHoursTracking(context: Context) {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START_WORKING_HOURS
        }
        ContextCompat.startForegroundService(context, intent)
        AppLogger.info(TAG, "Started working hours tracking service")
    }

    /**
     * Start on-duty trip tracking (5-minute intervals).
     */
    fun startOnDutyTracking(context: Context) {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START_ON_DUTY
        }
        ContextCompat.startForegroundService(context, intent)
        AppLogger.info(TAG, "Started on-duty tracking service")
    }

    /**
     * Stop location tracking service.
     */
    fun stopTracking(context: Context) {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        context.startService(intent)
        AppLogger.info(TAG, "Stopped tracking service")
    }

    /**
     * Calculate distance between two GPS coordinates using the Haversine formula.
     * @return Distance in kilometers
     */
    fun haversineDistanceKm(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2).pow(2)
        val c = 2 * asin(sqrt(a))
        return EARTH_RADIUS_KM * c
    }
}
