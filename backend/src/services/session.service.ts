import { getDatabase } from '../database/db.js';
import { env } from '../config/environment.js';
import { UpiUtil } from '../utils/upi.js';
import { logger } from '../utils/logger.js';
import { WebSocketService } from './websocket.service.js';

export interface CreateSessionParams {
  amount: number;
  currency?: string;
  note?: string;
  orderRef?: string;
  timeoutSeconds?: number;
}

export interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  order_ref: string | null;
  upi_uri: string;
  status: 'READY' | 'WAITING_FOR_PAYMENT' | 'PAYMENT_PROCESSING' | 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED' | 'EXPIRED' | 'UNKNOWN';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export class SessionService {
  /**
   * Creates a new payment session and generates valid UPI QR URI
   */
  public static createSession(params: CreateSessionParams): PaymentSession {
    const db = getDatabase();

    if (!UpiUtil.isValidAmount(params.amount)) {
      throw new Error(`Invalid amount: ${params.amount}. Amount must be positive with at most 2 decimals.`);
    }

    const merchantUpiIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'merchant_upi_id'").get() as any;
    const merchantNameSetting = db.prepare("SELECT value FROM settings WHERE key = 'merchant_name'").get() as any;

    const upiId = merchantUpiIdSetting?.value || env.MERCHANT_UPI_ID;
    const merchantName = merchantNameSetting?.value || env.MERCHANT_NAME;

    if (!UpiUtil.isValidUpiId(upiId)) {
      throw new Error(`Invalid configured Merchant UPI ID: "${upiId}". Update in settings.`);
    }

    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderRef = params.orderRef || `ORD_${Date.now().toString().slice(-8)}`;
    const note = params.note || `Pay to ${merchantName}`;
    const timeoutSec = params.timeoutSeconds || env.SESSION_TIMEOUT_SECONDS;
    const expiresAt = new Date(Date.now() + timeoutSec * 1000).toISOString();

    // Generate clean, universally compatible UPI Intent URI
    const upiUri = UpiUtil.generateUpiUri({
      pa: upiId,
      pn: merchantName,
      am: params.amount,
      cu: params.currency || 'INR',
      tn: note
    });

    // Cancel any previous pending WAITING_FOR_PAYMENT sessions
    db.prepare(`
      UPDATE payment_sessions 
      SET status = 'PAYMENT_CANCELLED', updated_at = CURRENT_TIMESTAMP 
      WHERE status IN ('WAITING_FOR_PAYMENT', 'READY')
    `).run();

    const insert = db.prepare(`
      INSERT INTO payment_sessions (
        id, amount, currency, note, order_ref, upi_uri, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'WAITING_FOR_PAYMENT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    insert.run(
      sessionId,
      params.amount,
      params.currency || 'INR',
      note,
      orderRef,
      upiUri,
      expiresAt
    );

    const session = this.getSessionById(sessionId)!;

    logger.info(`[SessionService] Created new session ${sessionId} for ₹${params.amount} (Ref: ${orderRef})`);

    // Broadcast session creation to all POS display clients
    WebSocketService.broadcast('SESSION_CREATED', {
      session,
      merchantName,
      merchantUpiId: upiId
    });

    return session;
  }

  /**
   * Retrieves the current active waiting session
   */
  public static getCurrentActiveSession(): (PaymentSession & { merchantName: string; merchantUpiId: string }) | null {
    const db = getDatabase();

    // First auto-expire any stale sessions
    this.checkAndExpireSessions();

    const session = db.prepare(`
      SELECT * FROM payment_sessions 
      WHERE status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
      AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get() as unknown as PaymentSession | undefined;

    if (!session) return null;

    const merchantUpiIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'merchant_upi_id'").get() as any;
    const merchantNameSetting = db.prepare("SELECT value FROM settings WHERE key = 'merchant_name'").get() as any;

    return {
      ...session,
      merchantName: merchantNameSetting?.value || env.MERCHANT_NAME,
      merchantUpiId: merchantUpiIdSetting?.value || env.MERCHANT_UPI_ID
    };
  }

  public static getSessionById(id: string): PaymentSession | null {
    const db = getDatabase();
    return (db.prepare('SELECT * FROM payment_sessions WHERE id = ?').get(id) as unknown as PaymentSession) || null;
  }

  /**
   * Cancels the currently active session
   */
  public static cancelCurrentSession(): boolean {
    const db = getDatabase();
    const active = this.getCurrentActiveSession();
    if (!active) return false;

    db.prepare(`
      UPDATE payment_sessions 
      SET status = 'PAYMENT_CANCELLED', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(active.id);

    logger.info(`[SessionService] Session ${active.id} cancelled by merchant.`);
    WebSocketService.broadcast('SESSION_CANCELLED', { sessionId: active.id });
    return true;
  }

  /**
   * Resets display to READY state
   */
  public static resetToReady(): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE payment_sessions 
      SET status = 'PAYMENT_CANCELLED', updated_at = CURRENT_TIMESTAMP 
      WHERE status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
    `).run();

    logger.info('[SessionService] Reset display to READY state.');
    WebSocketService.broadcast('SESSION_RESET', { status: 'READY' });
  }

  /**
   * Auto-expire past sessions
   */
  public static checkAndExpireSessions(): number {
    const db = getDatabase();
    const expiredSessions = db.prepare(`
      SELECT id FROM payment_sessions 
      WHERE status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
      AND datetime(expires_at) <= datetime('now')
    `).all() as unknown as { id: string }[];

    if (expiredSessions.length > 0) {
      db.prepare(`
        UPDATE payment_sessions 
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP 
        WHERE status IN ('WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING')
        AND datetime(expires_at) <= datetime('now')
      `).run();

      for (const s of expiredSessions) {
        WebSocketService.broadcast('SESSION_EXPIRED', { sessionId: s.id });
      }
    }

    return expiredSessions.length;
  }
}
