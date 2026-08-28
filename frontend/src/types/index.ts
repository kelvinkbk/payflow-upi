export type SessionStatus = 
  | 'READY'
  | 'WAITING_FOR_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  order_ref: string | null;
  upi_uri: string;
  status: SessionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  merchantName?: string;
  merchantUpiId?: string;
}

export interface Transaction {
  id: string;
  session_id: string | null;
  amount: number;
  currency: string;
  transaction_id: string;
  status: 'RECEIVED' | 'FAILED' | 'CANCELLED' | 'MISMATCH_REJECTED' | 'DUPLICATE_REJECTED';
  detection_source: 'notification' | 'gateway' | 'demo' | 'manual';
  payer_name: string | null;
  payer_vpa: string | null;
  app_source: string | null;
  bank_name: string | null;
  created_at: string;
}

export interface TransactionStats {
  totalCount: number;
  totalVolume: number;
  todayVolume: number;
  todayCount: number;
}

export interface MerchantConfig {
  merchantName: string;
  merchantUpiId: string;
  autoResetDelaySeconds: number;
  sessionTimeoutSeconds: number;
  soundboxVoiceEnabled: boolean;
  soundboxLanguage: string;
  soundboxVolume: number;
  androidDeviceToken: string;
  serverTime?: string;
}

export interface DeviceStatus {
  connected: boolean;
  status: 'ONLINE' | 'OFFLINE';
  message?: string;
  device?: {
    id: string;
    name: string;
    ip: string;
    batteryLevel: number;
    lastPing: string;
  };
}

export interface PaymentReceivedPayload {
  sessionId: string;
  amount: number;
  currency: string;
  transactionId: string;
  payerName: string;
  appSource: string;
  bankName?: string;
  detectionSource: string;
  timestamp: string;
}
