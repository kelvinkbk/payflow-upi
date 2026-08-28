export interface IncomingPaymentEvent {
  amount: number;
  currency: string;
  transactionId: string; // UTR or provider payment ID
  timestamp: string;
  source: 'notification' | 'gateway' | 'demo' | 'manual';
  payerName?: string;
  payerVpa?: string;
  appSource?: string; // e.g. 'Google Pay', 'PhonePe', 'Paytm', 'BHIM'
  bankName?: string;  // e.g. 'HDFC Bank', 'SBI', 'ICICI'
  rawPayload?: string;
  orderRef?: string;
}

export interface PaymentProcessResult {
  success: boolean;
  status: 'PAYMENT_RECEIVED' | 'MISMATCH_REJECTED' | 'DUPLICATE_REJECTED' | 'FAILED' | 'EXPIRED';
  message: string;
  matchedSessionId?: string;
  transactionId: string;
  amount: number;
  expectedAmount?: number;
  details?: Record<string, any>;
}

export interface PaymentProvider {
  readonly name: string;
  
  /**
   * Process and verify incoming payment event against active or pending sessions
   */
  processPayment(event: IncomingPaymentEvent): Promise<PaymentProcessResult>;
  
  /**
   * Health check for provider integration
   */
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}
