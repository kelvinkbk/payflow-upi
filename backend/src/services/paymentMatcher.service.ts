import { getDatabase } from '../database/db.js';
import { IncomingPaymentEvent, PaymentProcessResult } from '../providers/paymentProvider.interface.js';
import { logger } from '../utils/logger.js';
import { WebSocketService } from './websocket.service.js';

export class PaymentMatcherService {
  /**
   * Evaluates incoming payment event against active payment sessions
   */
  public static async processPaymentEvent(event: IncomingPaymentEvent): Promise<PaymentProcessResult> {
    const db = getDatabase();

    logger.info(`[PaymentMatcher] Processing payment: ₹${event.amount} (${event.currency}) [Tx: ${event.transactionId}] from ${event.source} / ${event.appSource || 'Unknown'}`);

    // Step 1: Duplicate Transaction Check
    const existingTx = db.prepare('SELECT id, session_id, amount, status, created_at FROM transactions WHERE transaction_id = ?').get(event.transactionId) as any;

    if (existingTx) {
      logger.warn(`[PaymentMatcher] Duplicate transaction detected: ${event.transactionId} was already processed at ${existingTx.created_at}`);
      
      WebSocketService.broadcast('PAYMENT_DUPLICATE_WARNING', {
        transactionId: event.transactionId,
        amount: event.amount,
        existingRecord: existingTx,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        status: 'DUPLICATE_REJECTED',
        message: `Transaction ${event.transactionId} has already been processed previously.`,
        transactionId: event.transactionId,
        amount: event.amount
      };
    }

    // Step 2: Find Active Payment Session
    // Look for active session in WAITING_FOR_PAYMENT or PAYMENT_PROCESSING state
    let activeSession = null;
    if (event.orderRef) {
      activeSession = db.prepare(`
        SELECT * FROM payment_sessions 
        WHERE order_ref = ? AND status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
        ORDER BY created_at DESC LIMIT 1
      `).get(event.orderRef) as any;
    }

    if (!activeSession) {
      // Find the most recent active session not yet expired
      activeSession = db.prepare(`
        SELECT * FROM payment_sessions 
        WHERE status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
        AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `).get() as any;
    }

    // Step 3: Amount Validation & Match
    if (!activeSession) {
      logger.warn(`[PaymentMatcher] No active waiting session found for incoming payment ₹${event.amount} (Tx: ${event.transactionId})`);

      // Store spontaneous received payment in ledger for accounting
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO transactions (
          id, session_id, amount, currency, transaction_id, status, detection_source,
          payer_name, payer_vpa, app_source, bank_name, raw_payload, created_at
        ) VALUES (?, NULL, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        txId,
        event.amount,
        event.currency || 'INR',
        event.transactionId,
        event.source,
        event.payerName || 'Anonymous Payer',
        event.payerVpa || null,
        event.appSource || null,
        event.bankName || null,
        event.rawPayload || null
      );

      // Broadcast spontaneous transaction
      WebSocketService.broadcast('UNSOLICITED_PAYMENT_RECEIVED', {
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency || 'INR',
        source: event.source,
        appSource: event.appSource,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        status: 'PAYMENT_RECEIVED',
        message: 'Payment received without an active session; recorded in ledger.',
        transactionId: event.transactionId,
        amount: event.amount
      };
    }

    // Strict Amount Comparison (Float comparison with 0.01 tolerance)
    const expectedAmount = Number(activeSession.amount);
    const receivedAmount = Number(event.amount);
    const amountDiff = Math.abs(expectedAmount - receivedAmount);

    if (amountDiff > 0.01) {
      logger.warn(`[PaymentMatcher] Amount mismatch! Expected ₹${expectedAmount.toFixed(2)}, but received ₹${receivedAmount.toFixed(2)} [Tx: ${event.transactionId}]`);

      // Record mismatch in ledger
      const txId = `tx_mismatch_${Date.now()}`;
      db.prepare(`
        INSERT INTO transactions (
          id, session_id, amount, currency, transaction_id, status, detection_source,
          payer_name, payer_vpa, app_source, bank_name, raw_payload, created_at
        ) VALUES (?, ?, ?, ?, ?, 'MISMATCH_REJECTED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        txId,
        activeSession.id,
        event.amount,
        event.currency || 'INR',
        event.transactionId,
        event.source,
        event.payerName || null,
        event.payerVpa || null,
        event.appSource || null,
        event.bankName || null,
        event.rawPayload || null
      );

      // Broadcast warning to merchant screen
      WebSocketService.broadcast('PAYMENT_AMOUNT_MISMATCH', {
        sessionId: activeSession.id,
        expectedAmount,
        receivedAmount,
        transactionId: event.transactionId,
        source: event.source,
        appSource: event.appSource,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        status: 'MISMATCH_REJECTED',
        message: `Amount mismatch: Expected ₹${expectedAmount.toFixed(2)}, received ₹${receivedAmount.toFixed(2)}`,
        matchedSessionId: activeSession.id,
        transactionId: event.transactionId,
        amount: receivedAmount,
        expectedAmount
      };
    }

    // Step 4: Successful Payment Match!
    logger.info(`[PaymentMatcher] ✅ Payment MATCHED successfully for Session ${activeSession.id}! Amount: ₹${receivedAmount.toFixed(2)}`);

    // Update session state in DB
    db.prepare(`
      UPDATE payment_sessions 
      SET status = 'PAYMENT_RECEIVED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(activeSession.id);

    // Save transaction in DB
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO transactions (
        id, session_id, amount, currency, transaction_id, status, detection_source,
        payer_name, payer_vpa, app_source, bank_name, raw_payload, created_at
      ) VALUES (?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      txId,
      activeSession.id,
      event.amount,
      event.currency || 'INR',
      event.transactionId,
      event.source,
      event.payerName || 'UPI Payer',
      event.payerVpa || null,
      event.appSource || 'UPI App',
      event.bankName || null,
      event.rawPayload || null
    );

    // Broadcast instant real-time celebration update to connected merchant and customer screens
    const successPayload = {
      sessionId: activeSession.id,
      amount: receivedAmount,
      currency: event.currency || 'INR',
      transactionId: event.transactionId,
      payerName: event.payerName || 'UPI Customer',
      appSource: event.appSource || 'UPI App',
      bankName: event.bankName,
      detectionSource: event.source,
      timestamp: new Date().toISOString()
    };

    WebSocketService.broadcast('PAYMENT_RECEIVED', successPayload);

    return {
      success: true,
      status: 'PAYMENT_RECEIVED',
      message: `Payment of ₹${receivedAmount.toFixed(2)} verified successfully!`,
      matchedSessionId: activeSession.id,
      transactionId: event.transactionId,
      amount: receivedAmount,
      expectedAmount,
      details: successPayload
    };
  }
}
