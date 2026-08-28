import { IncomingPaymentEvent, PaymentProcessResult, PaymentProvider } from './paymentProvider.interface.js';
import { PaymentMatcherService } from '../services/paymentMatcher.service.js';
import { logger } from '../utils/logger.js';

export class DemoPaymentProvider implements PaymentProvider {
  public readonly name = 'DemoPaymentProvider';

  public async processPayment(event: IncomingPaymentEvent): Promise<PaymentProcessResult> {
    logger.info(`[DemoPaymentProvider] Simulating payment processing for ₹${event.amount}`);

    // Ensure detection source is flagged as demo
    const demoEvent: IncomingPaymentEvent = {
      ...event,
      source: 'demo',
      transactionId: event.transactionId || `DEMO_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`,
      payerName: event.payerName || 'Demo Customer (Simulation)',
      appSource: event.appSource || 'Demo UPI Simulator',
      bankName: event.bankName || 'Demo Sandbox Bank'
    };

    return await PaymentMatcherService.processPaymentEvent(demoEvent);
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Demo provider is active and ready for simulated testing.' };
  }
}
