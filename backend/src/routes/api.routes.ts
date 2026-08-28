import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { WebhookController } from '../controllers/webhook.controller.js';
import { TransactionController } from '../controllers/transaction.controller.js';
import { ConfigController } from '../controllers/config.controller.js';
import { IosWebhookController } from '../controllers/iosWebhook.controller.js';
import { authenticateDevice } from '../middleware/auth.middleware.js';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Payment Session Lifecycle
apiRouter.post('/payment-session', SessionController.createSession);
apiRouter.get('/payment-session/current', SessionController.getCurrentSession);
apiRouter.get('/payment-session/:id', SessionController.getSession);
apiRouter.post('/payment-session/cancel', SessionController.cancelSession);
apiRouter.post('/payment-session/reset', SessionController.resetSession);

// Apple iPhone Shortcuts SMS Event (No Auth header needed for easy setup or optional token)
apiRouter.post('/ios-event', IosWebhookController.handleIosMessage);

// Verified Payment Event from Android App (Protected by X-Device-Token)
apiRouter.post('/payment-event', authenticateDevice, PaymentController.receivePaymentEvent);

// Raw Notification Event from Android App (Protected by X-Device-Token)
apiRouter.post('/notification-event', authenticateDevice, PaymentController.receiveRawNotification);

// Android Device Companion Heartbeat & Status
apiRouter.post('/device/heartbeat', authenticateDevice, PaymentController.receiveHeartbeat);
apiRouter.get('/device/status', PaymentController.getDeviceStatus);

// Demo & Test Sandbox Simulator (Unrestricted for local merchant testing)
apiRouter.post('/demo/payment', PaymentController.simulatePayment);

// Payment Gateway Webhooks (Razorpay / Cashfree / Custom UPI switch)
apiRouter.post('/webhooks/:provider', WebhookController.handleGatewayWebhook);

// Transaction History & Audit Ledger
apiRouter.get('/transactions', TransactionController.getTransactions);
apiRouter.get('/transactions/export', TransactionController.exportCsv);

// Configuration
apiRouter.get('/config', ConfigController.getConfig);
apiRouter.put('/config', ConfigController.updateConfig);
