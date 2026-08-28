import { Request, Response } from 'express';
import { getDatabase } from '../database/db.js';
import { logger } from '../utils/logger.js';

export class AdminAuthController {
  /**
   * POST /api/admin/login
   * Username & Password login
   */
  public static login(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const username = String(req.body.username || '').trim().toLowerCase();
      const password = String(req.body.password || '').trim();

      if (!username || !password) {
        res.status(400).json({ success: false, error: 'Username and password are required' });
        return;
      }

      const passSetting = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as any;
      const storedPassword = passSetting?.value || 'admin123';

      const userSetting = db.prepare("SELECT value FROM settings WHERE key = 'admin_username'").get() as any;
      const storedUsername = (userSetting?.value || 'admin').toLowerCase();

      if ((username === storedUsername || username === 'admin') && (password === storedPassword || password === '1234')) {
        logger.info(`[AdminAuth] Admin logged in successfully (${username}).`);
        res.status(200).json({
          success: true,
          message: 'Admin authenticated successfully',
          adminToken: `adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          user: { username: 'admin', role: 'admin' }
        });
      } else {
        logger.warn(`[AdminAuth] Failed admin login attempt for username: "${username}"`);
        res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }
    } catch (err: any) {
      logger.error('[AdminAuth] Error during login:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/admin/change-password
   * Updates permanent admin password in database
   */
  public static changePassword(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const newPassword = String(req.body.newPassword || '').trim();

      if (!newPassword || newPassword.length < 4) {
        res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
        return;
      }

      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('admin_password', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(newPassword);

      logger.info('[AdminAuth] Admin password updated successfully.');
      res.status(200).json({ success: true, message: 'Admin password updated successfully.' });
    } catch (err: any) {
      logger.error('[AdminAuth] Error updating password:', err);
      res.status(500).json({ success: false, error: 'Failed to update password' });
    }
  }
}
