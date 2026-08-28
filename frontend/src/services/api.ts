import { MerchantConfig, PaymentSession, Transaction, TransactionStats, DeviceStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api';

export const api = {
  // Session API
  async createSession(amount: number, note?: string, orderRef?: string): Promise<{ success: boolean; data: PaymentSession }> {
    const res = await fetch(`${API_BASE}/payment-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, note, orderRef })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create session' }));
      throw new Error(err.error || 'Failed to create session');
    }
    return res.json();
  },

  async getCurrentSession(): Promise<{ success: boolean; data: PaymentSession | null }> {
    const res = await fetch(`${API_BASE}/payment-session/current`);
    if (!res.ok) throw new Error('Failed to fetch current session');
    return res.json();
  },

  async getSession(id: string): Promise<{ success: boolean; data: PaymentSession }> {
    const res = await fetch(`${API_BASE}/payment-session/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async cancelSession(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/payment-session/cancel`, { method: 'POST' });
    return res.json();
  },

  async resetSession(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/payment-session/reset`, { method: 'POST' });
    return res.json();
  },

  // Transactions API
  async getTransactions(params?: { limit?: number; offset?: number; search?: string; status?: string }): Promise<{
    success: boolean;
    data: Transaction[];
    stats: TransactionStats;
    pagination: { limit: number; offset: number; hasMore: boolean };
  }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`${API_BASE}/transactions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/transactions/export`;
  },

  // Config API
  async getConfig(): Promise<{ success: boolean; data: MerchantConfig }> {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  },

  async updateConfig(config: Partial<MerchantConfig>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update config' }));
      throw new Error(err.error || 'Failed to update config');
    }
    return res.json();
  },

  // Demo Simulation API
  async simulatePayment(amount: number, payerName?: string, appSource?: string, transactionId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, payer_name: payerName, app_source: appSource, transaction_id: transactionId })
    });
    return res.json();
  },

  // Device Status API
  async getDeviceStatus(): Promise<DeviceStatus> {
    const res = await fetch(`${API_BASE}/device/status`);
    if (!res.ok) return { connected: false, status: 'OFFLINE' };
    return res.json();
  },

  // Admin Server-side Login Authentication
  async adminLogin(username: string, password: string): Promise<{ success: boolean; error?: string; adminToken?: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async changeAdminPassword(newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    return res.json();
  }
};
