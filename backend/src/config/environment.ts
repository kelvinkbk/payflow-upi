import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  HOST: string;
  MERCHANT_NAME: string;
  MERCHANT_UPI_ID: string;
  MERCHANT_CATEGORY_CODE?: string;
  DATABASE_PATH: string;
  ANDROID_DEVICE_TOKEN: string;
  PAYMENT_PROVIDER: 'demo' | 'notification' | 'gateway' | 'hybrid';
  GATEWAY_WEBHOOK_SECRET: string;
  SESSION_TIMEOUT_SECONDS: number;
  AUTO_RESET_DELAY_SECONDS: number;
  CORS_ORIGIN: string;
  NODE_ENV: string;
}

export const env: EnvironmentConfig = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MERCHANT_NAME: process.env.MERCHANT_NAME || 'MGOCSM Jaipur',
  MERCHANT_UPI_ID: process.env.MERCHANT_UPI_ID || 'mgocsmjaipur@nsdl',
  MERCHANT_CATEGORY_CODE: process.env.MERCHANT_CATEGORY_CODE || '5411', // Grocery stores, supermarkets
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), '../database/upi_display.db'),
  ANDROID_DEVICE_TOKEN: process.env.ANDROID_DEVICE_TOKEN || 'upi_secure_token_987654321',
  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER as any) || 'hybrid',
  GATEWAY_WEBHOOK_SECRET: process.env.GATEWAY_WEBHOOK_SECRET || 'secret_webhook_signature_key_upi',
  SESSION_TIMEOUT_SECONDS: parseInt(process.env.SESSION_TIMEOUT_SECONDS || '300', 10), // 5 min
  AUTO_RESET_DELAY_SECONDS: parseInt(process.env.AUTO_RESET_DELAY_SECONDS || '7', 10), // 7 sec display before return
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
