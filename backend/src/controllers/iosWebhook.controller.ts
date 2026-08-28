import { Request, Response } from 'express';
import { NotificationParserService } from '../services/notificationParser.service.js';
import { NotificationPaymentProvider } from '../providers/notificationPaymentProvider.js';
import { logger } from '../utils/logger.js';

export class IosWebhookController {
  private static notificationProvider = new NotificationPaymentProvider();

  /**
   * POST /api/ios-event
   * Simple endpoint specifically designed for Apple Shortcuts "Automation -> When I get a message"
   * Payload format:
   * {
   *   "text": "Rs 500.00 credited to a/c by UPI...",
   *   "sender": "NSDL-BANK"
   * }
   */
  public static async handleIosMessage(req: Request, res: Response): Promise<void> {
    try {
      const text = req.body.text || req.body.message || req.body.body || (typeof req.body === 'string' ? req.body : '');
      const sender = req.body.sender || 'iOS SMS';

      logger.info(`[IosWebhook] Received SMS from iPhone Shortcuts: "${text}" from ${sender}`);

      if (!text) {
        res.status(400).json({ success: false, error: 'Message text is required' });
        return;
      }

      const result = await IosWebhookController.notificationProvider.processRawNotification({
        packageName: 'com.apple.MobileSMS',
        title: sender,
        text: text
      });

      if (!result) {
        res.status(200).json({
          success: false,
          message: 'SMS received, but did not match a valid UPI credit payment.'
        });
        return;
      }

      res.status(result.success ? 200 : 422).json(result);
    } catch (err: any) {
      logger.error('[IosWebhook] Error processing iOS SMS:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
