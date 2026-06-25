package com.monolith.crm.hrms.service

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.monolith.crm.CrmApp
import com.monolith.crm.MainActivity
import com.monolith.crm.R
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.*

/**
 * Foreground service for persistent location tracking.
 *
 * Supports two modes:
 * - WORKING_HOURS: Hourly heartbeat during checked-in working hours
 * - ON_DUTY: 5-minute interval tracking during on-duty trips
 *
 * Features:
 * - Sticky foreground service (cannot be killed by user)
 * - Mock location detection
 * - Sends heartbeat to server via HrmsRepository
 * - Automatic stop outside working hours
 * - Persistent notification showing tracking status
 */
class LocationTrackingService : Service() {

    companion object {
        const val CHANNEL_ID = "hrms_location_tracking"
        const val NOTIFICATION_ID = 9001
        const val ACTION_START_WORKING_HOURS = "start_working_hours"
        const val ACTION_START_ON_DUTY = "start_on_duty"
        const val ACTION_STOP = "stop_tracking"
        const val EXTRA_SESSION_TYPE = "session_type"

        private const val TAG = "LocationTracking"
        private const val WORKING_HOURS_INTERVAL_MS = 60 * 60 * 1000L // 1 hour
        private const val ON_DUTY_INTERVAL_MS = 5 * 60 * 1000L // 5 minutes
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var currentSessionType: String = "WORKING_HOURS"
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        AppLogger.info(TAG, "LocationTrackingService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_WORKING_HOURS -> {
                currentSessionType = "WORKING_HOURS"
                startTracking(WORKING_HOURS_INTERVAL_MS)
            }
            ACTION_START_ON_DUTY -> {
                currentSessionType = "ON_DUTY"
                startTracking(ON_DUTY_INTERVAL_MS)
            }
            ACTION_STOP -> {
                stopTracking()
                return START_NOT_STICKY
            }
        }
        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startTracking(intervalMs: Long) {
        // Check permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            AppLogger.error(TAG, "Location permission not granted, cannot start tracking")
            stopSelf()
            return
        }

        // Start as foreground service
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        AppLogger.info(TAG, "Starting $currentSessionType tracking, interval: ${intervalMs / 1000}s")

        // Build location request
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateDistanceMeters(10f)
            .setWaitForAccurateLocation(true)
            .build()

        // Create callback
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                handleLocationUpdate(location)
            }
        }

        // Start location updates
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback!!,
            Looper.getMainLooper()
        )

        // Also get an immediate location
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                handleLocationUpdate(location)
            }
        }
    }

    private fun handleLocationUpdate(location: Location) {
        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }

        AppLogger.info(TAG, "Location update: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}, mock=$isMock")

        if (isMock) {
            AppLogger.warn(TAG, "WARNING: Mock location detected! Reporting to server.")
        }

        // Send heartbeat to server
        serviceScope.launch {
            try {
                val app = application as CrmApp
                val hrmsRepo = app.hrmsRepository
                val batteryLevel = getBatteryLevel()

                val result = hrmsRepo.sendHeartbeat(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy,
                    altitude = location.altitude,
                    speed = location.speed,
                    bearing = location.bearing,
                    batteryLevel = batteryLevel,
                    isMockLocation = isMock,
                    sessionType = currentSessionType
                )

                if (result.isSuccess) {
                    AppLogger.info(TAG, "Heartbeat sent successfully")
                    updateNotification("Last update: ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}")
                } else {
                    AppLogger.warn(TAG, "Heartbeat failed: ${result.exceptionOrNull()?.message}")
                }
            } catch (e: Exception) {
                AppLogger.error(TAG, "Heartbeat send error: ${e.message}", e)
            }
        }
    }

    private fun stopTracking() {
        AppLogger.info(TAG, "Stopping location tracking")
        locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
        locationCallback = null
        serviceScope.cancel()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun getBatteryLevel(): Int {
        return try {
            val batteryIntent = registerReceiver(null, android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, 100) ?: 100
            if (level >= 0 && scale > 0) (level * 100) / scale else -1
        } catch (_: Exception) { -1 }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "HRMS Location Tracking",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Tracks your location during working hours and on-duty trips"
            setShowBadge(false)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(subtitle: String? = null): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val title = if (currentSessionType == "ON_DUTY") "On-Duty Trip Tracking" else "Working Hours Tracking"
        val text = subtitle ?: "Location tracking is active"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(subtitle: String) {
        val notification = buildNotification(subtitle)
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
        serviceScope.cancel()
        AppLogger.info(TAG, "LocationTrackingService destroyed")
    }
}
