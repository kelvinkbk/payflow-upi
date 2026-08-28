import { IncomingPaymentEvent, PaymentProcessResult, PaymentProvider } from './paymentProvider.interface.js';
import { PaymentMatcherService } from '../services/paymentMatcher.service.js';
import { NotificationParserService } from '../services/notificationParser.service.js';
import { logger } from '../utils/logger.js';

export interface RawNotificationPayload {
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  postTime?: number;
  appName?: string;
}

export class NotificationPaymentProvider implements PaymentProvider {
  public readonly name = 'NotificationPaymentProvider';

  public async processPayment(event: IncomingPaymentEvent): Promise<PaymentProcessResult> {
    logger.info(`[NotificationPaymentProvider] Processing verified notification event: ₹${event.amount} (Tx: ${event.transactionId})`);
    return await PaymentMatcherService.processPaymentEvent({
      ...event,
      source: 'notification'
    });
  }

  /**
   * Parses raw notification and forwards to payment matching if valid payment received notification
   */
  public async processRawNotification(raw: RawNotificationPayload): Promise<PaymentProcessResult | null> {
    logger.info(`[NotificationPaymentProvider] Parsing incoming notification from ${raw.packageName}: "${raw.title}" - "${raw.text}"`);

    const parsed = NotificationParserService.parse(raw.packageName, raw.title, raw.text, raw.subText);

    if (!parsed.isPaymentReceived || !parsed.amount || !parsed.transactionId) {
      logger.info('[NotificationPaymentProvider] Notification does not indicate a valid incoming payment or could not parse amount/tx.');
      return null;
    }

    const event: IncomingPaymentEvent = {
      amount: parsed.amount,
      currency: parsed.currency || 'INR',
      transactionId: parsed.transactionId,
      timestamp: new Date().toISOString(),
      source: 'notification',
      payerName: parsed.payerName,
      payerVpa: parsed.payerVpa,
      appSource: parsed.appSource,
      bankName: parsed.bankName,
      rawPayload: JSON.stringify(raw)
    };

    return await this.processPayment(event);
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Notification listener provider ready for Android companion events.' };
  }
}
