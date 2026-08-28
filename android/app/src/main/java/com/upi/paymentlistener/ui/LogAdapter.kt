package com.upi.paymentlistener.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.upi.paymentlistener.R

data class InterceptedLog(
    val time: String,
    val amount: Double,
    val utr: String,
    val appSource: String,
    val status: String
)

class LogAdapter(private val items: MutableList<InterceptedLog> = mutableListOf()) :
    RecyclerView.Adapter<LogAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvAmount: TextView = view.findViewById(R.id.tvAmount)
        val tvUtr: TextView = view.findViewById(R.id.tvUtr)
        val tvApp: TextView = view.findViewById(R.id.tvApp)
        val tvTime: TextView = view.findViewById(R.id.tvTime)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_log, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.tvAmount.text = "₹${"%.2f".format(item.amount)}"
        holder.tvUtr.text = "UTR: ${item.utr}"
        holder.tvApp.text = item.appSource
        holder.tvTime.text = item.time
    }

    override fun getItemCount(): Int = items.size

    fun addLog(log: InterceptedLog) {
        items.add(0, log)
        notifyItemInserted(0)
    }
}
