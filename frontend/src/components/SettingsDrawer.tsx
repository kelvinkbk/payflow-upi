import React, { useState } from 'react';
import { X, Save, Volume2, Store, Clock, Key, Smartphone, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MerchantConfig } from '../types';
import { api } from '../services/api';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: MerchantConfig;
  onConfigSaved: (newConfig: MerchantConfig) => void;
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999,
        background: checked ? '#10b981' : 'rgba(255,255,255,0.12)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.25s ease',
        boxShadow: checked ? '0 0 14px rgba(16,185,129,0.45)' : 'none',
        flexShrink: 0
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.25s var(--ease-bounce)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
      }} />
    </button>
  );
}

// ── Section Divider ────────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        {icon}
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen, onClose, config, onConfigSaved
}) => {
  const [merchantName, setMerchantName]           = useState(config.merchantName);
  const [merchantUpiId, setMerchantUpiId]         = useState(config.merchantUpiId);
  const [autoResetDelay, setAutoResetDelay]       = useState(config.autoResetDelaySeconds);
  const [sessionTimeout, setSessionTimeout]       = useState(config.sessionTimeoutSeconds);
  const [soundboxVoiceEnabled, setSoundboxVoice]  = useState(config.soundboxVoiceEnabled);
  const [soundboxLanguage, setSoundboxLang]       = useState(config.soundboxLanguage);
  const [androidDeviceToken, setAndroidToken]     = useState(config.androidDeviceToken);
  const [adminPinInput, setAdminPinInput]         = useState('');
  const [showToken, setShowToken]                 = useState(false);
  const [showPin, setShowPin]                     = useState(false);
  const [isSaving, setIsSaving]                   = useState(false);
  const [msg, setMsg]                             = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);
    try {
      const updated: Partial<MerchantConfig> = {
        merchantName, merchantUpiId,
        autoResetDelaySeconds: Number(autoResetDelay),
        sessionTimeoutSeconds: Number(sessionTimeout),
        soundboxVoiceEnabled, soundboxLanguage, androidDeviceToken
      };
      await api.updateConfig(updated);
      if (adminPinInput.trim()) await api.changeAdminPassword(adminPinInput.trim());
      onConfigSaved({ ...config, ...updated } as MerchantConfig);
      setMsg({ text: 'Settings saved successfully!', isError: false });
      setTimeout(onClose, 900);
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update settings', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Merchant Configuration</h3>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>Changes apply immediately to all connected devices</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{
            background: msg.isError ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            border: `1px solid ${msg.isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px',
            fontSize: '0.85rem', fontWeight: 700,
            color: msg.isError ? '#f87171' : '#34d399',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {msg.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* ── Business Info ── */}
          <Section icon={<Store size={16} style={{ color: '#10b981' }} />} title="Business Identity">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Merchant / Shop Name</label>
              <input
                type="text" required className="form-input"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. MGOCSM Jaipur"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">UPI ID (VPA)</label>
              <input
                type="text" required className="form-input"
                value={merchantUpiId}
                onChange={(e) => setMerchantUpiId(e.target.value)}
                placeholder="e.g. store@okaxis"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                All UPI payments will be credited to this ID
              </span>
            </div>
          </Section>

          {/* ── Timing ── */}
          <Section icon={<Clock size={16} style={{ color: '#06b6d4' }} />} title="Timing & Timeouts">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Auto-Reset Delay (sec)</label>
                <input type="number" min={2} max={30} required className="form-input"
                  value={autoResetDelay}
                  onChange={(e) => setAutoResetDelay(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  After payment success screen
                </span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">QR Expiry (sec)</label>
                <input type="number" min={60} max={900} required className="form-input"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Max: 900s (15 min)
                </span>
              </div>
            </div>
          </Section>

          {/* ── Soundbox ── */}
          <Section icon={<Volume2 size={16} style={{ color: '#a855f7' }} />} title="Voice Soundbox Alert">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0' }}>Enable Voice Announcements</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Speaks payment amount aloud on receipt
                </div>
              </div>
              <Toggle checked={soundboxVoiceEnabled} onChange={setSoundboxVoice} />
            </div>
            {soundboxVoiceEnabled && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Voice Language</label>
                <select className="form-input" value={soundboxLanguage} onChange={(e) => setSoundboxLang(e.target.value)}>
                  <option value="en-IN">🇮🇳 Indian English — "Payment of ₹500 received"</option>
                  <option value="hi-IN">🇮🇳 Hindi — "UPI par ₹500 prapt hue"</option>
                </select>
              </div>
            )}
          </Section>

          {/* ── Android Token ── */}
          <Section icon={<Smartphone size={16} style={{ color: '#38bdf8' }} />} title="Android Companion App">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Device Authentication Token</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  required className="form-input"
                  value={androidDeviceToken}
                  onChange={(e) => setAndroidToken(e.target.value)}
                  style={{ paddingRight: 44, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
                <button type="button" onClick={() => setShowToken(!showToken)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Must match the token in the Android listener APK
              </span>
            </div>
          </Section>

          {/* ── Security ── */}
          <Section icon={<Key size={16} style={{ color: '#f59e0b' }} />} title="Security">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Change Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                New password is stored securely in the backend database
              </span>
            </div>
          </Section>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ flex: 2 }}>
              {isSaving ? (
                <><span className="spin-anim" style={{ display: 'inline-block' }}>⟳</span> Saving...</>
              ) : (
                <><Save size={16} /> Save Configuration</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
