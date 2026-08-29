import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ShieldCheck, Wifi, CheckCircle2, Battery, AlertTriangle, Copy, Check } from 'lucide-react';
import { DeviceStatus } from '../types';
import { api } from '../services/api';

interface AndroidPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToken: string;
}

const STEPS = [
  { num: '1', text: 'Install the UPI Listener APK on your shop Android phone.' },
  { num: '2', text: 'Open app → tap "Grant Notification Access" in Android Settings.' },
  { num: '3', text: 'Scan the QR above or enter the server IP + token manually.' },
  { num: '4', text: 'Once connected, payments via GPay / PhonePe / Paytm are detected instantly!' },
];

export const AndroidPairingModal: React.FC<AndroidPairingModalProps> = ({
  isOpen, onClose, deviceToken
}) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ connected: false, status: 'OFFLINE' });
  const [hostIp, setHostIp] = useState<string>(window.location.hostname || '192.168.1.100');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetch = async () => {
      try { setDeviceStatus(await api.getDeviceStatus()); } catch {}
    };
    fetch();
    const id = setInterval(fetch, 3000);
    return () => clearInterval(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const pairingPayload = JSON.stringify({
    serverUrl: `http://${hostIp}:3001`,
    deviceToken,
    merchantTerminal: 'POS-Counter-1',
    timestamp: Date.now()
  });

  const serverUrl = `http://${hostIp}:3001`;
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Smartphone size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Connect Android Listener</h3>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>Real-time UPI notification bridge</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Live Device Status */}
        <div style={{
          background: deviceStatus.connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${deviceStatus.connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 'var(--radius-md)', padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: deviceStatus.connected ? '#10b981' : '#f87171',
              boxShadow: deviceStatus.connected ? '0 0 10px #10b981' : 'none',
              animation: deviceStatus.connected ? 'pulse-dot 1.8s infinite' : 'none'
            }} />
            <div>
              <div style={{ fontWeight: 800, color: deviceStatus.connected ? '#34d399' : '#f87171', fontSize: '0.875rem' }}>
                {deviceStatus.connected ? '✓ Android Phone Connected & Listening' : 'No Phone Connected'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {deviceStatus.connected && deviceStatus.device
                  ? `${deviceStatus.device.name} · ${deviceStatus.device.ip}`
                  : 'Install & open the Android APK on your shop smartphone'}
              </div>
            </div>
          </div>
          {deviceStatus.connected && deviceStatus.device?.batteryLevel != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}>
              <Battery size={15} style={{ color: deviceStatus.device.batteryLevel > 20 ? '#34d399' : '#f87171' }} />
              {deviceStatus.device.batteryLevel}%
            </div>
          )}
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 16, display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <QRCodeSVG value={pairingPayload} size={160} level="M" />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Scan with Companion App
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Server IP Address</label>
              <input
                type="text" className="form-input"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Copy server URL */}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyUrl}
              style={{ fontSize: '0.8rem', padding: '8px 12px', width: '100%' }}
            >
              {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              {copied ? 'Copied!' : `Copy ${serverUrl}`}
            </button>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              📶 Phone and PC must be on the same Wi-Fi network.
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 2 }}>
            Setup Instructions
          </div>
          {STEPS.map(({ num, text }) => (
            <div key={num} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 800, color: '#34d399'
              }}>
                {num}
              </span>
              <span style={{ lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onClose} type="button">
          <CheckCircle2 size={16} /> Done
        </button>
      </div>
    </div>
  );
};
