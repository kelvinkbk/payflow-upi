package com.upi.paymentlistener.service

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.upi.paymentlistener.network.ApiClient
import com.upi.paymentlistener.network.PaymentEventRequest
import com.upi.paymentlistener.parser.NotificationParser
import com.upi.paymentlistener.parser.SupportedApps
import com.upi.paymentlistener.util.PreferenceManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class UpiNotificationListenerService : NotificationListenerService() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private lateinit var apiClient: ApiClient
    private lateinit var prefs: PreferenceManager

    companion object {
        private const val TAG = "UpiNotifListener"
        const val ACTION_PAYMENT_INTERCEPTED = "com.upi.paymentlistener.ACTION_PAYMENT_INTERCEPTED"
        const val EXTRA_AMOUNT = "extra_amount"
        const val EXTRA_UTR = "extra_utr"
        const val EXTRA_APP = "extra_app"
        const val EXTRA_RAW = "extra_raw"
        const val EXTRA_STATUS = "extra_status"

        var isConnectedToNotificationService = false
            private set
    }

    override fun onCreate() {
        super.onCreate()
        apiClient = ApiClient(this)
        prefs = PreferenceManager(this)
        Log.i(TAG, "UpiNotificationListenerService created.")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isConnectedToNotificationService = true
        Log.i(TAG, "Notification Listener connected successfully.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        isConnectedToNotificationService = false
        Log.w(TAG, "Notification Listener disconnected.")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification.extras ?: return

        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val subText = extras.getCharSequence("android.subText")?.toString()

        Log.d(TAG, "Notification intercepted from $packageName: Title='$title', Text='$text'")

        // Check if package is a supported UPI app or banking app
        if (!SupportedApps.isSupported(packageName)) {
            // Unrelated app notification -> ignored safely for privacy
            return
        }

        // Parse notification
        val parsed = NotificationParser.parse(packageName, title, text, subText)

        if (!parsed.isValid || parsed.amount <= 0.0) {
            Log.d(TAG, "Notification from $packageName did not contain a valid payment received event.")
            return
        }

        val utr = parsed.transactionId ?: "NOTIF_${System.currentTimeMillis()}"
        val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

        Log.i(TAG, "✅ PARSED PAYMENT: ₹${parsed.amount} via ${parsed.appSource} (Tx: $utr, Payer: ${parsed.payerName})")

        // Broadcast to local UI log
        val localIntent = Intent(ACTION_PAYMENT_INTERCEPTED).apply {
            putExtra(EXTRA_AMOUNT, parsed.amount)
            putExtra(EXTRA_UTR, utr)
            putExtra(EXTRA_APP, parsed.appSource)
            putExtra(EXTRA_RAW, parsed.rawText)
            putExtra(EXTRA_STATUS, "FORWARDING")
            setPackage(packageName)
        }
        sendBroadcast(localIntent)

        // Forward to merchant backend if auto-forward is enabled
        if (prefs.isAutoForwardEnabled) {
            scope.launch {
                val request = PaymentEventRequest(
                    amount = parsed.amount,
                    currency = parsed.currency,
                    transactionId = utr,
                    timestamp = nowIso,
                    source = "notification",
                    payerName = parsed.payerName,
                    appSource = parsed.appSource,
                    bankName = parsed.bankName,
                    rawPayload = parsed.rawText
                )

                val result = apiClient.sendPaymentEvent(request)
                result.onSuccess {
                    Log.i(TAG, "Successfully forwarded payment to Merchant POS: ${it.message}")
                }.onFailure {
                    Log.e(TAG, "Failed to forward payment to Merchant POS: ${it.message}")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }
}
