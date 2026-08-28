package com.upi.paymentlistener.parser

import java.util.regex.Pattern

data class ParsedPayment(
    val isValid: Boolean,
    val amount: Double = 0.0,
    val currency: String = "INR",
    val transactionId: String? = null,
    val payerName: String? = null,
    val appSource: String = "UPI",
    val bankName: String? = null,
    val rawText: String = ""
)

object NotificationParser {

    private val SPAM_PATTERNS = listOf(
        Pattern.compile("\\b(cashback|scratch card|won|winner|discount|coupon|offer|flat off)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(debited|sent to|paid to|recharge of|bill due|reminder|apply now)\\b", Pattern.CASE_INSENSITIVE)
    )

    private val RECEIVED_KEYWORDS = listOf(
        Pattern.compile("\\breceived\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bcredited\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bpaid you\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bprapt hue\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\btransferred to your\\b", Pattern.CASE_INSENSITIVE)
    )

    // Regex for amount: ₹500, Rs. 500.00, INR 500
    private val AMOUNT_PATTERN = Pattern.compile(
        "(?:₹|Rs\\.?|INR)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    // Regex for UTR / Reference ID (12-digit number or alphanumeric)
    private val UTR_PATTERNS = listOf(
        Pattern.compile("\\b(?:UTR|Ref|Reference|Txn(?:\\s*ID)?|transaction\\s*ID|UPI\\s*Ref(?:\\s*No)?|RRR)\\s*[:#\\-\\s]\\s*([A-Za-z0-9]{8,22})\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bUPI(?:/CR)?/([0-9]{12})\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b([0-9]{12})\\b")
    )

    fun parse(packageName: String, title: String, text: String, subText: String? = null): ParsedPayment {
        val fullText = "$title $text ${subText ?: ""}".trim()
        val appName = SupportedApps.getDisplayName(packageName)

        if (fullText.isEmpty()) {
            return ParsedPayment(isValid = false, rawText = fullText)
        }

        // Filter out spam / marketing
        for (pattern in SPAM_PATTERNS) {
            if (pattern.matcher(fullText).find()) {
                return ParsedPayment(isValid = false, rawText = fullText)
            }
        }

        // Check for received / credit confirmation
        val isCredit = RECEIVED_KEYWORDS.any { it.matcher(fullText).find() }
        if (!isCredit) {
            return ParsedPayment(isValid = false, rawText = fullText)
        }

        // Extract amount
        val amountMatcher = AMOUNT_PATTERN.matcher(fullText)
        var parsedAmount = 0.0
        if (amountMatcher.find()) {
            val amountGroup = amountMatcher.group(1)?.replace(",", "")
            parsedAmount = amountGroup?.toDoubleOrNull() ?: 0.0
        }

        if (parsedAmount <= 0.0) {
            return ParsedPayment(isValid = false, rawText = fullText)
        }

        // Extract UTR / Tx ID
        var utr: String? = null
        for (pattern in UTR_PATTERNS) {
            val m = pattern.matcher(fullText)
            if (m.find()) {
                utr = m.group(1)?.trim()
                break
            }
        }

        if (utr == null) {
            val timeBucket = System.currentTimeMillis() / 30000
            utr = "APP_${timeBucket}_${(parsedAmount * 100).toLong()}"
        }

        // Extract Payer Name
        var payerName: String? = null
        val paidYouMatcher = Pattern.compile("([A-Za-z\\s]{2,30}?)\\s+paid\\s+you", Pattern.CASE_INSENSITIVE).matcher(text)
        if (paidYouMatcher.find()) {
            val n = paidYouMatcher.group(1)?.trim()
            if (n != null && !n.contains("payment", ignoreCase = true) && n.length >= 2) {
                payerName = n
            }
        }

        if (payerName == null) {
            val fromMatcher = Pattern.compile("(?:from|by)\\s+([A-Za-z\\s]{2,30}?)(?:\\s+on|\\s+via|\\s+in|\\s+using|\\.|$)", Pattern.CASE_INSENSITIVE).matcher(text)
            if (fromMatcher.find()) {
                val n = fromMatcher.group(1)?.trim()
                if (n != null && !n.contains("bank", ignoreCase = true) && !n.contains("upi", ignoreCase = true) && n.length >= 2) {
                    payerName = n
                }
            }
        }

        return ParsedPayment(
            isValid = true,
            amount = parsedAmount,
            currency = "INR",
            transactionId = utr,
            payerName = payerName,
            appSource = appName,
            rawText = fullText
        )
    }
}
