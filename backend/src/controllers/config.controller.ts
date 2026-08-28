import { Request, Response } from 'express';
import { getDatabase } from '../database/db.js';
import { UpiUtil } from '../utils/upi.js';
import { logger } from '../utils/logger.js';
import { WebSocketService } from '../services/websocket.service.js';

export class ConfigController {
  /**
   * GET /api/config
   * Returns current merchant and system configuration
   */
  public static getConfig(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      
      const configMap: Record<string, string> = {};
      rows.forEach((r) => {
        configMap[r.key] = r.value;
      });

      res.status(200).json({
        success: true,
        data: {
          merchantName: configMap['merchant_name'] || 'SuperStore Express',
          merchantUpiId: configMap['merchant_upi_id'] || 'merchant@okaxis',
          autoResetDelaySeconds: parseInt(configMap['auto_reset_delay_seconds'] || '7', 10),
          sessionTimeoutSeconds: parseInt(configMap['session_timeout_seconds'] || '300', 10),
          soundboxVoiceEnabled: configMap['soundbox_voice_enabled'] === 'true',
          soundboxLanguage: configMap['soundbox_language'] || 'en-IN',
          soundboxVolume: parseFloat(configMap['soundbox_volume'] || '1.0'),
          androidDeviceToken: configMap['android_device_token'] || 'upi_secure_token_987654321',
          serverTime: new Date().toISOString()
        }
      });
    } catch (err: any) {
      logger.error('[ConfigController] Error fetching config:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve configuration' });
    }
  }

  /**
   * PUT /api/config
   * Updates merchant details, soundbox parameters, or tokens
   */
  public static updateConfig(req: Request, res: Response): void {
    try {
      const {
        merchantName,
        merchantUpiId,
        autoResetDelaySeconds,
        sessionTimeoutSeconds,
        soundboxVoiceEnabled,
        soundboxLanguage,
        soundboxVolume,
        androidDeviceToken
      } = req.body;

      if (merchantUpiId && !UpiUtil.isValidUpiId(merchantUpiId)) {
        res.status(400).json({
          success: false,
          error: `Invalid UPI ID format: "${merchantUpiId}". Must be username@handle format (e.g. store@okaxis).`
        });
        return;
      }

      const db = getDatabase();
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');

      if (merchantName !== undefined) stmt.run('merchant_name', String(merchantName).trim());
      if (merchantUpiId !== undefined) stmt.run('merchant_upi_id', String(merchantUpiId).trim());
      if (autoResetDelaySeconds !== undefined) stmt.run('auto_reset_delay_seconds', String(autoResetDelaySeconds));
      if (sessionTimeoutSeconds !== undefined) stmt.run('session_timeout_seconds', String(sessionTimeoutSeconds));
      if (soundboxVoiceEnabled !== undefined) stmt.run('soundbox_voice_enabled', String(soundboxVoiceEnabled));
      if (soundboxLanguage !== undefined) stmt.run('soundbox_language', String(soundboxLanguage));
      if (soundboxVolume !== undefined) stmt.run('soundbox_volume', String(soundboxVolume));
      if (androidDeviceToken !== undefined) stmt.run('android_device_token', String(androidDeviceToken).trim());

      logger.info('[ConfigController] Merchant configuration updated successfully.');

      // Broadcast settings update to POS screens
      WebSocketService.broadcast('CONFIG_UPDATED', {
        merchantName,
        merchantUpiId,
        autoResetDelaySeconds,
        soundboxVoiceEnabled
      });

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (err: any) {
      logger.error('[ConfigController] Error updating config:', err);
      res.status(500).json({ success: false, error: 'Failed to update configuration' });
    }
  }
}
