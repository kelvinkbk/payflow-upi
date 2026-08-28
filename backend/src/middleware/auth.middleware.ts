import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/db.js';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export function authenticateDevice(req: Request, res: Response, next: NextFunction): void {
  const headerToken = (req.headers['x-device-token'] as string) || 
                      (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].substring(7) : undefined);

  if (!headerToken) {
    logger.warn(`[AuthMiddleware] Missing device authentication token from IP: ${req.ip}`);
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing X-Device-Token header.'
    });
    return;
  }

  const db = getDatabase();
  const tokenSetting = db.prepare("SELECT value FROM settings WHERE key = 'android_device_token'").get() as any;
  const validToken = tokenSetting?.value || env.ANDROID_DEVICE_TOKEN;

  if (headerToken !== validToken) {
    logger.warn(`[AuthMiddleware] Invalid device token attempt from IP: ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid device token.'
    });
    return;
  }

  next();
}
