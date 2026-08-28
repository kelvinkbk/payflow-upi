import { Request, Response } from 'express';
import { SessionService } from '../services/session.service.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const CreateSessionSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be greater than 0' }),
  currency: z.string().default('INR').optional(),
  note: z.string().max(100).optional(),
  orderRef: z.string().max(50).optional(),
  timeoutSeconds: z.number().min(30).max(3600).optional()
});

export class SessionController {
  /**
   * POST /api/payment-session
   * Generates a new payment session with dynamic UPI QR URI
   */
  public static createSession(req: Request, res: Response): void {
    try {
      const parsed = CreateSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.format()
        });
        return;
      }

      const session = SessionService.createSession(parsed.data);
      res.status(201).json({
        success: true,
        data: session
      });
    } catch (err: any) {
      logger.error('[SessionController] Failed to create session:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to create payment session'
      });
    }
  }

  /**
   * GET /api/payment-session/current
   * Fetches active pending session for display
   */
  public static getCurrentSession(req: Request, res: Response): void {
    try {
      const session = SessionService.getCurrentActiveSession();
      res.status(200).json({
        success: true,
        data: session // null if no active session
      });
    } catch (err: any) {
      logger.error('[SessionController] Error fetching current session:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve current payment session'
      });
    }
  }

  /**
   * GET /api/payment-session/:id
   * Fetches a specific session by ID for dedicated customer links
   */
  public static getSession(req: Request, res: Response): void {
    try {
      const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const session = SessionService.getSessionById(sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: 'Payment session not found or expired' });
        return;
      }
      res.status(200).json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve session' });
    }
  }

  /**
   * POST /api/payment-session/cancel
   * Cancels active session
   */
  public static cancelSession(req: Request, res: Response): void {
    try {
      const cancelled = SessionService.cancelCurrentSession();
      res.status(200).json({
        success: true,
        message: cancelled ? 'Session cancelled successfully' : 'No active session was found to cancel'
      });
    } catch (err: any) {
      logger.error('[SessionController] Error cancelling session:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel session'
      });
    }
  }

  /**
   * POST /api/payment-session/reset
   * Resets display back to READY
   */
  public static resetSession(req: Request, res: Response): void {
    try {
      SessionService.resetToReady();
      res.status(200).json({
        success: true,
        message: 'Terminal reset to READY'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset terminal'
      });
    }
  }
}
