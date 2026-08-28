package com.upi.paymentlistener.service

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.upi.paymentlistener.PaymentListenerApp
import com.upi.paymentlistener.network.ApiClient
import com.upi.paymentlistener.network.HeartbeatRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class HeartbeatService : Service() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private lateinit var apiClient: ApiClient

    override fun onCreate() {
        super.onCreate()
        apiClient = ApiClient(this)
        startForeground(101, createNotification())
        startHeartbeatLoop()
    }

    private fun startHeartbeatLoop() {
        scope.launch {
            while (isActive) {
                try {
                    val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
                    val batteryLevel = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
                    val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"

                    apiClient.sendHeartbeat(
                        HeartbeatRequest(
                            deviceId = Build.FINGERPRINT.hashCode().toString(),
                            deviceName = deviceName,
                            batteryLevel = batteryLevel
                        )
                    )
                } catch (e: Exception) {
                    // Ignored
                }
                delay(20000) // Ping every 20 seconds
            }
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, PaymentListenerApp.CHANNEL_ID)
            .setContentTitle("UPI Listener Active")
            .setContentText("Monitoring UPI payment alerts & connected to POS")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }
}
