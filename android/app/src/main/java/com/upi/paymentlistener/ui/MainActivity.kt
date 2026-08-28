package com.upi.paymentlistener.ui

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.upi.paymentlistener.R
import com.upi.paymentlistener.network.ApiClient
import com.upi.paymentlistener.network.PaymentEventRequest
import com.upi.paymentlistener.service.HeartbeatService
import com.upi.paymentlistener.service.UpiNotificationListenerService
import com.upi.paymentlistener.util.PreferenceManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: PreferenceManager
    private lateinit var apiClient: ApiClient
    private lateinit var logAdapter: LogAdapter

    private lateinit var tvStatus: TextView
    private lateinit var etServerUrl: EditText
    private lateinit var etToken: EditText
    private lateinit var btnSave: Button
    private lateinit var btnPermission: Button
    private lateinit var btnTestPayment: Button
    private lateinit var rvLogs: RecyclerView

    private val paymentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == UpiNotificationListenerService.ACTION_PAYMENT_INTERCEPTED) {
                val amount = intent.getDoubleExtra(UpiNotificationListenerService.EXTRA_AMOUNT, 0.0)
                val utr = intent.getStringExtra(UpiNotificationListenerService.EXTRA_UTR) ?: "—"
                val app = intent.getStringExtra(UpiNotificationListenerService.EXTRA_APP) ?: "UPI"
                val time = SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date())

                logAdapter.addLog(InterceptedLog(time, amount, utr, app, "RECEIVED"))
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = PreferenceManager(this)
        apiClient = ApiClient(this)

        initViews()
        setupListeners()
        startHeartbeatService()

        val filter = IntentFilter(UpiNotificationListenerService.ACTION_PAYMENT_INTERCEPTED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(paymentReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(paymentReceiver, filter)
        }
    }

    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        etServerUrl = findViewById(R.id.etServerUrl)
        etToken = findViewById(R.id.etToken)
        btnSave = findViewById(R.id.btnSave)
        btnPermission = findViewById(R.id.btnPermission)
        btnTestPayment = findViewById(R.id.btnTestPayment)
        rvLogs = findViewById(R.id.rvLogs)

        etServerUrl.setText(prefs.serverUrl)
        etToken.setText(prefs.deviceToken)

        logAdapter = LogAdapter()
        rvLogs.layoutManager = LinearLayoutManager(this)
        rvLogs.adapter = logAdapter
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }

    private fun updatePermissionStatus() {
        val isGranted = isNotificationServiceEnabled()
        if (isGranted) {
            tvStatus.text = "🟢 LISTENER ACTIVE & MONITORING UPI APPS"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
            btnPermission.text = "Permission Granted ✓"
            btnPermission.isEnabled = false
        } else {
            tvStatus.text = "🔴 NOTIFICATION ACCESS REQUIRED"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            btnPermission.text = "Grant Notification Access"
            btnPermission.isEnabled = true
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }

    private fun setupListeners() {
        btnPermission.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnSave.setOnClickListener {
            val url = etServerUrl.text.toString().trim()
            val token = etToken.text.toString().trim()
            if (url.isNotEmpty() && token.isNotEmpty()) {
                prefs.serverUrl = url
                prefs.deviceToken = token
                Toast.makeText(this, "Settings Saved!", Toast.LENGTH_SHORT).show()
            }
        }

        btnTestPayment.setOnClickListener {
            val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            val testUtr = "TEST_UTR_${System.currentTimeMillis()}"

            CoroutineScope(Dispatchers.IO).launch {
                val req = PaymentEventRequest(
                    amount = 500.0,
                    currency = "INR",
                    transactionId = testUtr,
                    timestamp = nowIso,
                    source = "notification",
                    payerName = "Test Customer (Android)",
                    appSource = "Google Pay"
                )

                val res = apiClient.sendPaymentEvent(req)
                runOnUiThread {
                    res.onSuccess {
                        Toast.makeText(this@MainActivity, "Test ₹500 Forwarded to Display!", Toast.LENGTH_SHORT).show()
                        val time = SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date())
                        logAdapter.addLog(InterceptedLog(time, 500.0, testUtr, "Google Pay (Test)", "SUCCESS"))
                    }.onFailure {
                        Toast.makeText(this@MainActivity, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun startHeartbeatService() {
        val intent = Intent(this, HeartbeatService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(paymentReceiver)
    }
}
