import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  // Ensure directory exists
  const dbDir = path.dirname(env.DATABASE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory at: ${dbDir}`);
  }

  logger.info(`Initializing SQLite database (node:sqlite) at: ${env.DATABASE_PATH}`);
  dbInstance = new DatabaseSync(env.DATABASE_PATH);

  // Optimize performance and durability with pragmas
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS payment_sessions (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        note TEXT,
        order_ref TEXT,
        upi_uri TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('READY', 'WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'EXPIRED', 'UNKNOWN')),
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON payment_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON payment_sessions(created_at);

    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        transaction_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        detection_source TEXT NOT NULL,
        payer_name TEXT,
        payer_vpa TEXT,
        app_source TEXT,
        bank_name TEXT,
        raw_payload TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON transactions(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS device_heartbeats (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        ip_address TEXT,
        battery_level INTEGER,
        last_ping DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'ONLINE'
    );
  `);
  logger.info('Database schema verified/applied successfully.');

  // Initialize default settings if not exists
  const getSetting = dbInstance.prepare('SELECT value FROM settings WHERE key = ?');
  const setSetting = dbInstance.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');

  const defaultSettings: Record<string, string> = {
    merchant_name: env.MERCHANT_NAME,
    merchant_upi_id: env.MERCHANT_UPI_ID,
    auto_reset_delay_seconds: String(env.AUTO_RESET_DELAY_SECONDS),
    session_timeout_seconds: String(env.SESSION_TIMEOUT_SECONDS),
    soundbox_voice_enabled: 'true',
    soundbox_language: 'en-IN',
    soundbox_volume: '1.0',
    android_device_token: env.ANDROID_DEVICE_TOKEN
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    const existing = getSetting.get(k);
    if (!existing) {
      setSetting.run(k, v);
    }
  }

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed cleanly.');
  }
}
