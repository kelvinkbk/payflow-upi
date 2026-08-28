import { Request, Response } from 'express';
import { GatewayPaymentProvider } from '../providers/gatewayPaymentProvider.js';
import { logger } from '../utils/logger.js';

export class WebhookController {
  private static gatewayProvider = new GatewayPaymentProvider();

  /**
   * POST /api/webhooks/:provider
   * Handles payment gateway webhooks (Razorpay, Cashfree, Bank switches, etc.)
   */
  public static async handleGatewayWebhook(req: Request, res: Response): Promise<void> {
    const providerParam = req.params.provider;
    const provider = (Array.isArray(providerParam) ? providerParam[0] : providerParam || '').toLowerCase();
    const signature = (req.headers['x-razorpay-signature'] || 
                       req.headers['x-webhook-signature'] || 
                       req.headers['x-cashfree-signature'] || 
                       req.headers['signature']) as string;

    logger.info(`[WebhookController] Received webhook from provider: "${provider}"`);

    // In production with webhook secret configured, verify HMAC signature
    if (signature && req.body) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const isValid = WebhookController.gatewayProvider.verifySignature(rawBody, signature);
      if (!isValid) {
        logger.warn(`[WebhookController] Invalid signature for provider ${provider}`);
        res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }
    }

    const paymentEvent = WebhookController.gatewayProvider.parseWebhookPayload(provider, req.body);
    if (!paymentEvent) {
      logger.warn(`[WebhookController] Could not parse valid payment from webhook payload for provider: ${provider}`);
      res.status(200).json({ success: false, message: 'Ignored: non-payment or unrecognized webhook payload' });
      return;
    }

    const result = await WebhookController.gatewayProvider.processPayment(paymentEvent);
    res.status(200).json({
      success: true,
      result
    });
  }
}
