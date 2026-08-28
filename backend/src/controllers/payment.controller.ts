import { Request, Response } from 'express';
import { z } from 'zod';
import { NotificationPaymentProvider } from '../providers/notificationPaymentProvider.js';
import { DemoPaymentProvider } from '../providers/demoPaymentProvider.js';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../database/db.js';

const PaymentEventSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR').optional(),
  transaction_id: z.string().min(1, 'Transaction ID / UTR required'),
  timestamp: z.string().optional(),
  source: z.enum(['notification', 'gateway', 'demo', 'manual']).default('notification'),
  payer_name: z.string().optional(),
  payer_vpa: z.string().optional(),
  app_source: z.string().optional(),
  bank_name: z.string().optional(),
  order_ref: z.string().optional(),
  raw_payload: z.any().optional()
});

const RawNotificationSchema = z.object({
  package_name: z.string().min(1),
  title: z.string(),
  text: z.string(),
  sub_text: z.string().optional(),
  post_time: z.number().optional(),
  app_name: z.string().optional()
});

const DemoPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR').optional(),
  payer_name: z.string().optional(),
  app_source: z.string().optional(),
  transaction_id: z.string().optional()
});

export class PaymentController {
  private static notificationProvider = new NotificationPaymentProvider();
  private static demoProvider = new DemoPaymentProvider();

  /**
   * POST /api/payment-event
   * Receives verified payment event from authenticated Android listener or local client
   */
  public static async receivePaymentEvent(req: Request, res: Response): Promise<void> {
    try {
      const parsed = PaymentEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format()
        });
        return;
      }

      const d = parsed.data;
      const result = await PaymentController.notificationProvider.processPayment({
        amount: d.amount,
        currency: d.currency || 'INR',
        transactionId: d.transaction_id,
        timestamp: d.timestamp || new Date().toISOString(),
        source: d.source,
        payerName: d.payer_name,
        payerVpa: d.payer_vpa,
        appSource: d.app_source,
        bankName: d.bank_name,
        orderRef: d.order_ref,
        rawPayload: typeof d.raw_payload === 'string' ? d.raw_payload : JSON.stringify(d.raw_payload)
      });

      res.status(result.success ? 200 : 422).json(result);
    } catch (err: any) {
      logger.error('[PaymentController] Error processing payment event:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error processing payment'
      });
    }
  }

  /**
   * POST /api/notification-event
   * Receives raw notification from Android NotificationListenerService and parses it internally
   */
  public static async receiveRawNotification(req: Request, res: Response): Promise<void> {
    try {
      const parsed = RawNotificationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format()
        });
        return;
      }

      const d = parsed.data;
      const result = await PaymentController.notificationProvider.processRawNotification({
        packageName: d.package_name,
        title: d.title,
        text: d.text,
        subText: d.sub_text,
        postTime: d.post_time,
        appName: d.app_name
      });

      if (!result) {
        res.status(200).json({
          success: false,
          message: 'Notification analyzed, but not recognized as a valid incoming UPI payment.'
        });
        return;
      }

      res.status(result.success ? 200 : 422).json(result);
    } catch (err: any) {
      logger.error('[PaymentController] Error handling raw notification:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to process notification'
      });
    }
  }

  /**
   * POST /api/demo/payment
   * Sandbox simulation endpoint for testing
   */
  public static async simulatePayment(req: Request, res: Response): Promise<void> {
    try {
      const parsed = DemoPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format()
        });
        return;
      }

      const d = parsed.data;
      const result = await PaymentController.demoProvider.processPayment({
        amount: d.amount,
        currency: d.currency || 'INR',
        transactionId: d.transaction_id || `DEMO_UTR_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        source: 'demo',
        payerName: d.payer_name || 'Rahul Sharma (Demo)',
        appSource: d.app_source || 'Google Pay Simulator'
      });

      res.status(result.success ? 200 : 422).json(result);
    } catch (err: any) {
      logger.error('[PaymentController] Error in simulated payment:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to simulate payment'
      });
    }
  }

  /**
   * POST /api/device/heartbeat
   * Receives heartbeat from Android phone listener to show connection status on POS screen
   */
  public static receiveHeartbeat(req: Request, res: Response): void {
    try {
      const { deviceId, deviceName, batteryLevel } = req.body;
      const db = getDatabase();
      
      db.prepare(`
        INSERT OR REPLACE INTO device_heartbeats (
          device_id, device_name, ip_address, battery_level, last_ping, status
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'ONLINE')
      `).run(
        deviceId || 'android_phone_primary',
        deviceName || 'Android UPI Listener',
        req.ip || '127.0.0.1',
        batteryLevel || 100
      );

      res.status(200).json({
        success: true,
        message: 'Heartbeat acknowledged',
        serverTime: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/device/status
   * Returns listener phone connectivity status
   */
  public static getDeviceStatus(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const device = db.prepare(`
        SELECT * FROM device_heartbeats 
        ORDER BY last_ping DESC LIMIT 1
      `).get() as any;

      if (!device) {
        res.json({
          connected: false,
          status: 'OFFLINE',
          message: 'No Android listener has registered yet'
        });
        return;
      }

      // If ping within 60 seconds, considered ONLINE
      const lastPingTime = new Date(device.last_ping).getTime();
      const isOnline = Date.now() - lastPingTime < 60000;

      res.json({
        connected: isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        device: {
          id: device.device_id,
          name: device.device_name,
          ip: device.ip_address,
          batteryLevel: device.battery_level,
          lastPing: device.last_ping
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
