package com.upi.paymentlistener.util

import android.content.Context
import android.content.SharedPreferences

class PreferenceManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("upi_listener_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_AUTO_FORWARD = "auto_forward"
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "http://192.168.1.100:3001") ?: "http://192.168.1.100:3001"
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value.trim()).apply()

    var deviceToken: String
        get() = prefs.getString(KEY_DEVICE_TOKEN, "upi_secure_token_987654321") ?: "upi_secure_token_987654321"
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value.trim()).apply()

    var isAutoForwardEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_FORWARD, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_FORWARD, value).apply()
}
