import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ShieldCheck, Wifi, CheckCircle2, Battery, AlertTriangle } from 'lucide-react';
import { DeviceStatus } from '../types';
import { api } from '../services/api';

interface AndroidPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToken: string;
}

export const AndroidPairingModal: React.FC<AndroidPairingModalProps> = ({
  isOpen,
  onClose,
  deviceToken
}) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ connected: false, status: 'OFFLINE' });
  const [hostIp, setHostIp] = useState<string>(window.location.hostname || '192.168.1.100');

  useEffect(() => {
    if (!isOpen) return;

    const fetchStatus = async () => {
      try {
        const s = await api.getDeviceStatus();
        setDeviceStatus(s);
      } catch (err) {
        // Ignored
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Pairing payload formatted for Android app auto-config
  const pairingPayload = JSON.stringify({
    serverUrl: `http://${hostIp}:3001`,
    deviceToken,
    merchantTerminal: 'POS-Counter-1',
    timestamp: Date.now()
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={24} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Connect Android Listener</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Live Device Status Banner */}
        <div style={{
          background: deviceStatus.connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${deviceStatus.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`status-dot ${deviceStatus.connected ? 'pulsing' : ''}`} style={{ color: deviceStatus.connected ? '#10b981' : '#f87171' }} />
            <div>
              <div style={{ fontWeight: 800, color: deviceStatus.connected ? '#34d399' : '#f87171', fontSize: '0.9rem' }}>
                {deviceStatus.connected ? 'Android Phone Connected & Listening' : 'No Phone Connected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {deviceStatus.connected && deviceStatus.device ? `Device: ${deviceStatus.device.name} (${deviceStatus.device.ip})` : 'Install & open the Android APK on the shop smartphone'}
              </div>
            </div>
          </div>

          {deviceStatus.connected && deviceStatus.device?.batteryLevel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>
              <Battery size={16} /> {deviceStatus.device.batteryLevel}%
            </div>
          )}
        </div>

        {/* QR Code for Instant Auto-Pairing */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            display: 'inline-block',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            <QRCodeSVG value={pairingPayload} size={180} level="M" />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Scan with the <strong>UPI Listener Companion App</strong> to configure instantly.
          </div>
        </div>

        {/* Server IP Configuration */}
        <div className="form-group">
          <label className="form-label">Merchant PC / Local Server IP:</label>
          <input
            type="text"
            className="form-input"
            value={hostIp}
            onChange={(e) => setHostIp(e.target.value)}
            placeholder="e.g. 192.168.1.100"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Ensure your Android phone is connected to the same Wi-Fi network.
          </span>
        </div>

        {/* Setup Steps */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Setup Instructions:</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>1.</span> Open app & tap "Grant Notification Access" in Android settings.
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>2.</span> Scan the QR above or enter IP: <code>http://{hostIp}:3001</code>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>3.</span> When a customer pays via GPay/PhonePe/Paytm, the notification is instantly parsed and confirmed!
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <button className="btn-primary" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
