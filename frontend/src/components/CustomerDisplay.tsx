import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Share2, ExternalLink, Timer } from 'lucide-react';
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

// ── Circular SVG Countdown Timer ──────────────────────────────────────────────
function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, seconds / total));
  const dash = circ * progress;
  const isUrgent = seconds < 30;

  return (
    <div className="circular-countdown" title={`Expires in ${seconds}s`}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        {/* track */}
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        {/* progress */}
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#10b981'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dasharray 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="circular-countdown-number" style={{ color: isUrgent ? '#f87171' : '#10b981' }}>
        {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`}
      </div>
    </div>
  );
}

// ── UPI App Button ────────────────────────────────────────────────────────────
function UpiAppBtn({
  href, label, abbr, color, bg, border
}: {
  href: string; label: string; abbr: string;
  color: string; bg: string; border: string;
}) {
  return (
    <a
      href={href}
      className="upi-app-btn"
      style={{ background: bg, borderColor: border }}
      onClick={(e) => {
        // Attempt to open; if fails gracefully ignore
        setTimeout(() => {}, 800);
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 6,
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900,
        color: '#fff', flexShrink: 0, letterSpacing: '-0.02em'
      }}>
        {abbr}
      </span>
      <span>{label}</span>
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const CustomerDisplay: React.FC<CustomerDisplayProps> = ({
  session, paymentSuccessData, merchantName, merchantUpiId, autoResetSeconds, onReset
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [copied, setCopied] = useState(false);

  // Expiry countdown
  useEffect(() => {
    if (!session || session.status !== 'WAITING_FOR_PAYMENT') return;
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [session]);

  const handleCopyLink = useCallback(() => {
    if (!session) return;
    const url = `${window.location.origin}/?session=${session.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [session]);

  const handleWhatsApp = useCallback(() => {
    if (!session) return;
    const url = `${window.location.origin}/?session=${session.id}`;
    const msg = `Please pay ₹${session.amount.toFixed(2)} via UPI:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }, [session]);

  // ── STATE 1: PAYMENT_RECEIVED ─────────────────────────────────────────────
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

  // ── STATE 2: WAITING_FOR_PAYMENT ─────────────────────────────────────────
  if (session && session.status === 'WAITING_FOR_PAYMENT') {
    const upiQuery = session.upi_uri.replace(/^upi:\/\/pay\?/, '').replace(/%40/g, '@');
    const gpayUri    = `tez://upi/pay?${upiQuery}`;
    const phonepeUri = `phonepe://pay?${upiQuery}`;
    const paytmUri   = `paytmmp://upi/pay?${upiQuery}`;
    const bhimUri    = `upi://pay?${upiQuery}`;

    return (
      <div className="glass-card customer-display-card">
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800 }}>
          <span className="status-dot pulsing" />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.82rem' }}>
            Scan &amp; Pay Here
          </span>
        </div>

        {/* Amount */}
        <div className="display-amount-badge">
          <span className="currency-symbol">₹</span>
          {session.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* QR Frame with scan-line */}
        <div className="qr-frame-wrapper pulsing-border" style={{ position: 'relative' }}>
          <QRCodeSVG
            value={session.upi_uri}
            size={248}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
              x: undefined, y: undefined,
              height: 30, width: 30,
              excavate: true
            }}
          />
          <div className="qr-scan-line" />
        </div>

        {/* Timer + instruction row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 700 }}>
              Scan with any UPI App
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              to pay ₹{session.amount.toFixed(2)}
            </div>
          </div>
          <CircularTimer seconds={secondsRemaining} total={300} />
        </div>

        {/* 1-Tap UPI App Buttons */}
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', textAlign: 'center' }}>
            Tap to Open Your UPI App
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <UpiAppBtn href={gpayUri}    label="Google Pay" abbr="G"   color="#4285F4" bg="rgba(66,133,244,0.12)"  border="rgba(66,133,244,0.35)"  />
            <UpiAppBtn href={phonepeUri} label="PhonePe"    abbr="Pe"  color="#5f259f" bg="rgba(95,37,159,0.18)"   border="rgba(95,37,159,0.4)"    />
            <UpiAppBtn href={paytmUri}   label="Paytm"      abbr="P"   color="#00b9f5" bg="rgba(0,185,245,0.12)"   border="rgba(0,185,245,0.35)"   />
            <UpiAppBtn href={bhimUri}    label="Any UPI"    abbr="UPI" color="#10b981" bg="rgba(16,185,129,0.12)"  border="rgba(16,185,129,0.35)"  />
          </div>
        </div>

        {/* Share / Copy row */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '380px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyLink}
            style={{ flex: 1, fontSize: '0.82rem', padding: '9px' }}
          >
            {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleWhatsApp}
            style={{ flex: 1, fontSize: '0.82rem', padding: '9px', borderColor: 'rgba(37,211,102,0.35)', color: '#25D366' }}
          >
            <Share2 size={14} /> WhatsApp
          </button>
        </div>

        {/* Merchant UPI ID */}
        <div className="merchant-id-pill">
          <span>UPI ID:</span>
          <strong style={{ color: '#f1f5f9' }}>{session.merchantUpiId || merchantUpiId}</strong>
        </div>

        {/* App strip */}
        <div className="supported-apps-strip">
          {[['#4285F4','GPay'],['#5f259f','PhonePe'],['#00b9f5','Paytm'],['#00833a','BHIM'],['#f59e0b','Any UPI']].map(([c, n]) => (
            <div key={n} className="app-chip">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 6px ${c}` }} />
              {n}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STATE 3: READY / IDLE ─────────────────────────────────────────────────
  return (
    <div className="glass-card customer-display-card">
      <div className="ready-screen-container">
        {/* Icon with animated pulse rings */}
        <div style={{ position: 'relative', width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-ring" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
          <div className="pulse-ring" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
          <div className="pulse-ring" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
          <div className="ready-icon-halo">
            <QrCode size={52} strokeWidth={2} />
          </div>
        </div>

        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          {merchantName || 'MGOCSM Jaipur'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '340px', textAlign: 'center', lineHeight: 1.6 }}>
          Enter payment amount on the counter terminal to display a dynamic UPI QR code.
        </p>

        <div className="merchant-id-pill">
          <QrCode size={13} />
          <span>Accepting payments at:</span>
          <strong style={{ color: '#34d399' }}>{merchantUpiId}</strong>
        </div>

        {/* UPI trust strip */}
        <div className="supported-apps-strip" style={{ marginTop: '12px' }}>
          {[['#4285F4','Google Pay'],['#5f259f','PhonePe'],['#00b9f5','Paytm'],['#00833a','BHIM UPI']].map(([c, n]) => (
            <div key={n} className="app-chip">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 6px ${c}` }} />
              {n}
            </div>
          ))}
        </div>

        {/* NPCI secure badge */}
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#10b981' }}>●</span> NPCI Certified · Zero Fees · 256-bit Secure
        </div>
      </div>
    </div>
  );
};
