import React, { useState } from 'react';
import { X, Save, Volume2, Store, Clock, Key } from 'lucide-react';
import { MerchantConfig } from '../types';
import { api } from '../services/api';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: MerchantConfig;
  onConfigSaved: (newConfig: MerchantConfig) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onConfigSaved
}) => {
  const [merchantName, setMerchantName] = useState(config.merchantName);
  const [merchantUpiId, setMerchantUpiId] = useState(config.merchantUpiId);
  const [autoResetDelay, setAutoResetDelay] = useState(config.autoResetDelaySeconds);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeoutSeconds);
  const [soundboxVoiceEnabled, setSoundboxVoiceEnabled] = useState(config.soundboxVoiceEnabled);
  const [soundboxLanguage, setSoundboxLanguage] = useState(config.soundboxLanguage);
  const [androidDeviceToken, setAndroidDeviceToken] = useState(config.androidDeviceToken);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);
    try {
      const updated: Partial<MerchantConfig> = {
        merchantName,
        merchantUpiId,
        autoResetDelaySeconds: Number(autoResetDelay),
        sessionTimeoutSeconds: Number(sessionTimeout),
        soundboxVoiceEnabled,
        soundboxLanguage,
        androidDeviceToken
      };

      await api.updateConfig(updated);
      
      if (adminPinInput.trim()) {
        await api.changeAdminPassword(adminPinInput.trim());
      }

      onConfigSaved({
        ...config,
        ...updated
      } as MerchantConfig);

      setMsg({ text: 'Settings updated successfully!', isError: false });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update settings', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store size={22} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Merchant Configuration</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {msg && (
          <div style={{
            background: msg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${msg.isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: msg.isError ? '#f87171' : '#34d399'
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Shop / Merchant Business Name</label>
            <input
              type="text"
              className="form-input"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Merchant UPI ID (VPA)</label>
            <input
              type="text"
              className="form-input"
              value={merchantUpiId}
              onChange={(e) => setMerchantUpiId(e.target.value)}
              placeholder="e.g. store@okaxis"
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              UPI payments from customers will be credited to this ID.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Auto-Reset Delay (sec)</label>
              <input
                type="number"
                min={2}
                max={30}
                className="form-input"
                value={autoResetDelay}
                onChange={(e) => setAutoResetDelay(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">QR Expiry Timeout (sec)</label>
              <input
                type="number"
                min={60}
                max={900}
                className="form-input"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Soundbox voice settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            margin: '16px 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Voice Soundbox Alert</span>
              </div>
              <input
                type="checkbox"
                checked={soundboxVoiceEnabled}
                onChange={(e) => setSoundboxVoiceEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>

            {soundboxVoiceEnabled && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Voice Language</label>
                <select
                  className="form-input"
                  value={soundboxLanguage}
                  onChange={(e) => setSoundboxLanguage(e.target.value)}
                >
                  <option value="en-IN">Indian English ("Payment of ₹500 received...")</option>
                  <option value="hi-IN">Hindi ("UPI par ₹500 prapt hue...")</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Android Device Authentication Token</label>
            <input
              type="text"
              className="form-input"
              value={androidDeviceToken}
              onChange={(e) => setAndroidDeviceToken(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Must match the security token entered on the Android listener app.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={16} style={{ color: '#3b82f6' }} /> Admin Dashboard PIN / Password
            </label>
            <input
              type="password"
              className="form-input"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              placeholder="Leave blank to keep current PIN, or type new PIN"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Sets permanent Admin PIN across all devices in backend database.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ flex: 1 }}>
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
