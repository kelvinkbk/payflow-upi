package com.upi.paymentlistener.network

import com.google.gson.annotations.SerializedName

data class PaymentEventRequest(
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String = "INR",
    @SerializedName("transaction_id") val transactionId: String,
    @SerializedName("timestamp") val timestamp: String,
    @SerializedName("source") val source: String = "notification",
    @SerializedName("payer_name") val payerName: String? = null,
    @SerializedName("payer_vpa") val payerVpa: String? = null,
    @SerializedName("app_source") val appSource: String? = null,
    @SerializedName("bank_name") val bankName: String? = null,
    @SerializedName("order_ref") val orderRef: String? = null,
    @SerializedName("raw_payload") val rawPayload: String? = null
)

data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("batteryLevel") val batteryLevel: Int
)

data class PaymentEventResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("status") val status: String,
    @SerializedName("message") val message: String
)
