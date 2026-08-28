import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, AlertCircle, RefreshCw } from 'lucide-react';
import { PaymentReceivedPayload, PaymentSession } from '../types';
import { SuccessCelebration } from './SuccessCelebration';

interface CustomerDisplayProps {
  session: PaymentSession | null;
  paymentSuccessData: PaymentReceivedPayload | null;
  merchantName: string;
  merchantUpiId: string;
  autoResetSeconds: number;
  onReset: () => void;
}

export const CustomerDisplay: React.FC<CustomerDisplayProps> = ({
  session,
  paymentSuccessData,
  merchantName,
  merchantUpiId,
  autoResetSeconds,
  onReset
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Expiry countdown timer for active session
  useEffect(() => {
    if (!session || session.status !== 'WAITING_FOR_PAYMENT') return;

    const calculateRemaining = () => {
      const expiresAt = new Date(session.expires_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setSecondsRemaining(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // State 1: PAYMENT_RECEIVED Screen
  if (paymentSuccessData || session?.status === 'PAYMENT_RECEIVED') {
    const dataToDisplay: PaymentReceivedPayload = paymentSuccessData || {
      sessionId: session?.id || 'manual',
      amount: session?.amount || 0,
      currency: 'INR',
      transactionId: 'VERIFIED_ON_LEDGER',
      payerName: 'UPI Customer',
      appSource: 'UPI App',
      detectionSource: 'system',
      timestamp: new Date().toISOString()
    };

    return (
      <div className="glass-card customer-display-card">
        <SuccessCelebration 
          data={dataToDisplay}
          autoResetSeconds={autoResetSeconds}
          onReset={onReset}
        />
      </div>
    );
  }

  // State 2: WAITING_FOR_PAYMENT Screen with Dynamic QR Code
  if (session && session.status === 'WAITING_FOR_PAYMENT') {
    return (
      <div className="glass-card customer-display-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800 }}>
          <span className="status-dot pulsing" />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.85rem' }}>
            Scan & Pay Here
          </span>
        </div>

        {/* Amount Display */}
        <div className="display-amount-badge">
          <span className="currency-symbol">₹</span>
          {session.amount.toFixed(2)}
        </div>

        {/* Dynamic High Contrast UPI QR Frame */}
        <div className="qr-frame-wrapper pulsing-border">
          <QRCodeSVG
            value={session.upi_uri}
            size={240}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true
            }}
          />
        </div>

        {/* Payment instructions and timer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
            Scan with any UPI App to Pay ₹{session.amount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: secondsRemaining < 30 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
            QR expires in {formatTimer(secondsRemaining)}
          </div>
        </div>

        {/* Direct Mobile UPI App Selectors */}
        {(() => {
          const upiQuery = session.upi_uri.replace(/^upi:\/\/pay\?/, '');
          const gpayUri = `tez://upi/pay?${upiQuery}`;
          const phonepeUri = `phonepe://pay?${upiQuery}`;
          const paytmUri = `paytmmp://pay?${upiQuery}`;
          const bhimUri = `bhim://pay?${upiQuery}`;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '380px', marginTop: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tap your UPI App to Pay:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <a
                  href={gpayUri}
                  className="btn-secondary"
                  style={{
                    textDecoration: 'none',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'rgba(66, 133, 244, 0.4)',
                    color: '#ffffff',
                    background: 'rgba(66, 133, 244, 0.15)'
                  }}
                >
                  <span style={{ color: '#4285F4', fontWeight: 900 }}>G</span> Google Pay
                </a>

                <a
                  href={phonepeUri}
                  className="btn-secondary"
                  style={{
                    textDecoration: 'none',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'rgba(95, 37, 159, 0.4)',
                    color: '#ffffff',
                    background: 'rgba(95, 37, 159, 0.2)'
                  }}
                >
                  <span style={{ color: '#a855f7', fontWeight: 900 }}>Pe</span> PhonePe
                </a>

                <a
                  href={paytmUri}
                  className="btn-secondary"
                  style={{
                    textDecoration: 'none',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'rgba(0, 185, 245, 0.4)',
                    color: '#ffffff',
                    background: 'rgba(0, 185, 245, 0.15)'
                  }}
                >
                  <span style={{ color: '#00b9f5', fontWeight: 900 }}>P</span> Paytm
                </a>

                <a
                  href={session.upi_uri}
                  className="btn-secondary"
                  style={{
                    textDecoration: 'none',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: '#ffffff',
                    background: 'rgba(16, 185, 129, 0.15)'
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 900 }}>UPI</span> Any App / WA
                </a>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/?session=${session.id}`;
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Payment link copied! Send it on WhatsApp/SMS to your customer.');
                  });
                }}
                style={{ fontSize: '0.82rem', padding: '8px 12px', marginTop: '4px' }}
              >
                📋 Copy Shareable Payment Link
              </button>
            </div>
          );
        })()}

        {/* Merchant UPI ID pill */}
        <div className="merchant-id-pill">
          <span>UPI ID:</span>
          <strong style={{ color: '#f1f5f9' }}>{session.merchantUpiId || merchantUpiId}</strong>
        </div>

        {/* Supported Apps Strip */}
        <div className="supported-apps-strip">
          <div className="app-chip"><span style={{ color: '#4285F4' }}>●</span> GPay</div>
          <div className="app-chip"><span style={{ color: '#5f259f' }}>●</span> PhonePe</div>
          <div className="app-chip"><span style={{ color: '#00b9f5' }}>●</span> Paytm</div>
          <div className="app-chip"><span style={{ color: '#00833a' }}>●</span> BHIM</div>
          <div className="app-chip"><span style={{ color: '#ff9900' }}>●</span> Any UPI</div>
        </div>
      </div>
    );
  }

  // State 3: READY / Idle Standby Screen
  return (
    <div className="glass-card customer-display-card">
      <div className="ready-screen-container">
        <div className="ready-icon-halo">
          <QrCode size={52} strokeWidth={2.2} />
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          {merchantName || 'SuperStore Express'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '360px', marginBottom: '20px' }}>
          Enter payment amount on the counter terminal to display dynamic UPI QR code.
        </p>

        <div className="merchant-id-pill">
          <span>Accepting UPI payments at:</span>
          <strong style={{ color: '#34d399' }}>{merchantUpiId}</strong>
        </div>

        {/* Supported Apps Strip */}
        <div className="supported-apps-strip" style={{ marginTop: '32px' }}>
          <div className="app-chip"><span style={{ color: '#4285F4' }}>●</span> Google Pay</div>
          <div className="app-chip"><span style={{ color: '#5f259f' }}>●</span> PhonePe</div>
          <div className="app-chip"><span style={{ color: '#00b9f5' }}>●</span> Paytm</div>
          <div className="app-chip"><span style={{ color: '#00833a' }}>●</span> BHIM UPI</div>
        </div>
      </div>
    </div>
  );
};
