package com.upi.paymentlistener

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class PaymentListenerApp : Application() {

    companion object {
        const val CHANNEL_ID = "upi_listener_channel"
        lateinit var instance: PaymentListenerApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "UPI Listener Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the UPI notification listener active in background"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
