package com.upi.paymentlistener.parser

data class AppMetadata(
    val packageName: String,
    val displayName: String,
    val isBank: Boolean = false
)

object SupportedApps {
    val APPS = listOf(
        // Major Indian UPI Consumer & Merchant Apps
        AppMetadata("com.google.android.apps.nbu.paisa.user", "Google Pay"),
        AppMetadata("com.google.android.apps.nbu.paisa.merchant", "Google Pay for Business"),
        AppMetadata("com.phonepe.app", "PhonePe"),
        AppMetadata("com.phonepe.app.business", "PhonePe Business"),
        AppMetadata("net.one97.paytm", "Paytm"),
        AppMetadata("com.paytm.business", "Paytm for Business"),
        AppMetadata("in.org.npci.upiapp", "BHIM UPI"),
        AppMetadata("in.amazon.mShop.android.shopping", "Amazon Pay"),
        AppMetadata("com.dreamplug.androidapp", "CRED"),
        AppMetadata("com.bharatpe.app", "BharatPe"),
        AppMetadata("com.freecharge.android", "Freecharge"),
        AppMetadata("com.mobikwik_new", "MobiKwik"),

        // Major Banking Apps
        AppMetadata("com.snapwork.hdfc", "HDFC MobileBanking", isBank = true),
        AppMetadata("com.sbi.lotusintouch", "YONO SBI", isBank = true),
        AppMetadata("com.csam.icici.bank.imobile", "ICICI iMobile Pay", isBank = true),
        AppMetadata("com.axis.mobile", "Axis Mobile", isBank = true),
        AppMetadata("com.msf.kbank.mobile", "Kotak Mobile Banking", isBank = true),
        AppMetadata("com.idfcfirstbank.optimus", "IDFC FIRST Bank", isBank = true),
        AppMetadata("com.bankofbaroda.mconnect", "bob World", isBank = true),
        AppMetadata("com.pnb.pnbone", "PNB ONE", isBank = true),

        // Default SMS messaging apps (Bank SMS alerts)
        AppMetadata("com.google.android.apps.messaging", "Google Messages (Bank SMS)", isBank = true),
        AppMetadata("com.samsung.android.messaging", "Samsung Messages (Bank SMS)", isBank = true)
    )

    private val packageMap = APPS.associateBy { it.packageName }

    fun isSupported(packageName: String): Boolean {
        return packageMap.containsKey(packageName)
    }

    fun getDisplayName(packageName: String): String {
        return packageMap[packageName]?.displayName ?: "UPI App ($packageName)"
    }
}
