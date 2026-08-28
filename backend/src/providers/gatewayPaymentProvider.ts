import crypto from 'crypto';
import { IncomingPaymentEvent, PaymentProcessResult, PaymentProvider } from './paymentProvider.interface.js';
import { PaymentMatcherService } from '../services/paymentMatcher.service.js';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export class GatewayPaymentProvider implements PaymentProvider {
  public readonly name = 'GatewayPaymentProvider';

  public async processPayment(event: IncomingPaymentEvent): Promise<PaymentProcessResult> {
    logger.info(`[GatewayPaymentProvider] Processing gateway payment event: ₹${event.amount} (Tx: ${event.transactionId})`);
    return await PaymentMatcherService.processPaymentEvent({
      ...event,
      source: 'gateway'
    });
  }

  /**
   * Verifies HMAC-SHA256 webhook signature
   */
  public verifySignature(payloadBody: string | Buffer, receivedSignature: string, secret?: string): boolean {
    const key = secret || env.GATEWAY_WEBHOOK_SECRET;
    if (!key || !receivedSignature) return false;

    try {
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(payloadBody);
      const expectedSignature = hmac.digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature));
    } catch (err) {
      logger.error('[GatewayPaymentProvider] Error validating signature:', err);
      return false;
    }
  }

  /**
   * Translates common payment gateway webhook payloads (Razorpay, Cashfree, Bank Switch) into standard IncomingPaymentEvent
   */
  public parseWebhookPayload(provider: string, body: any): IncomingPaymentEvent | null {
    try {
      if (provider === 'razorpay' || body.event === 'payment.captured') {
        const payment = body.payload?.payment?.entity || body;
        return {
          amount: (payment.amount || 0) / 100, // Razorpay uses paise
          currency: payment.currency || 'INR',
          transactionId: payment.id || payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
          timestamp: new Date((payment.created_at || Date.now() / 1000) * 1000).toISOString(),
          source: 'gateway',
          payerName: payment.notes?.payer_name || payment.contact,
          payerVpa: payment.vpa,
          appSource: 'Razorpay UPI',
          bankName: payment.bank,
          orderRef: payment.notes?.order_ref || payment.order_id,
          rawPayload: JSON.stringify(body)
        };
      }

      if (provider === 'cashfree' || body.data?.order) {
        const data = body.data || body;
        const payment = data.payment || {};
        return {
          amount: parseFloat(payment.payment_amount || data.order?.order_amount || 0),
          currency: payment.payment_currency || 'INR',
          transactionId: payment.cf_payment_id ? String(payment.cf_payment_id) : payment.bank_reference,
          timestamp: new Date().toISOString(),
          source: 'gateway',
          payerName: data.customer_details?.customer_name,
          payerVpa: payment.payment_method?.upi?.upi_id,
          appSource: 'Cashfree UPI',
          orderRef: data.order?.order_id,
          rawPayload: JSON.stringify(body)
        };
      }

      // Generic standard webhook format
      if (body.amount && body.transaction_id) {
        return {
          amount: parseFloat(body.amount),
          currency: body.currency || 'INR',
          transactionId: String(body.transaction_id),
          timestamp: body.timestamp || new Date().toISOString(),
          source: 'gateway',
          payerName: body.payer_name,
          payerVpa: body.payer_vpa,
          appSource: body.app_source || 'Gateway Webhook',
          bankName: body.bank_name,
          orderRef: body.order_ref,
          rawPayload: JSON.stringify(body)
        };
      }

      return null;
    } catch (err) {
      logger.error('[GatewayPaymentProvider] Failed to parse webhook payload:', err);
      return null;
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Gateway webhook provider active.' };
  }
}
