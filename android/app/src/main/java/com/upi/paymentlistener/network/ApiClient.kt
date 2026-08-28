package com.upi.paymentlistener.network

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.upi.paymentlistener.util.PreferenceManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiClient(private val context: Context) {

    private val gson = Gson()
    private val prefs = PreferenceManager(context)
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()

    companion object {
        private const val TAG = "ApiClient"
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }

    suspend fun sendPaymentEvent(event: PaymentEventRequest): Result<PaymentEventResponse> = withContext(Dispatchers.IO) {
        try {
            val baseUrl = prefs.serverUrl.removeSuffix("/")
            val url = "$baseUrl/api/payment-event"
            val jsonBody = gson.toJson(event)

            Log.i(TAG, "Posting payment event to $url: $jsonBody")

            val request = Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
                .addHeader("X-Device-Token", prefs.deviceToken)
                .post(jsonBody.toRequestBody(JSON))
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                Log.i(TAG, "Server response [${response.code}]: $bodyStr")

                if (response.isSuccessful) {
                    val respObj = gson.fromJson(bodyStr, PaymentEventResponse::class.java)
                    Result.success(respObj)
                } else {
                    Result.failure(Exception("Server returned error: ${response.code} $bodyStr"))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error posting payment event", e)
            Result.failure(e)
        }
    }

    suspend fun sendHeartbeat(heartbeat: HeartbeatRequest): Boolean = withContext(Dispatchers.IO) {
        try {
            val baseUrl = prefs.serverUrl.removeSuffix("/")
            val url = "$baseUrl/api/device/heartbeat"
            val jsonBody = gson.toJson(heartbeat)

            val request = Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
                .addHeader("X-Device-Token", prefs.deviceToken)
                .post(jsonBody.toRequestBody(JSON))
                .build()

            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            false
        }
    }
}
