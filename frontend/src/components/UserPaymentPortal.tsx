import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Heart, User, Sparkles, ShieldCheck, ArrowRight, Lock, Zap, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import { PaymentSession, PaymentReceivedPayload } from '../types';
import { SuccessCelebration } from './SuccessCelebration';

interface UserPaymentPortalProps {
  merchantName: string;
  merchantUpiId: string;
  autoResetSeconds: number;
  onPaymentSuccess?: (payload: PaymentReceivedPayload) => void;
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000, 5000];

const TRUST_BADGES = [
  { icon: <ShieldCheck size={12} />, label: '256-bit Secure' },
  { icon: <Lock size={12} />, label: 'NPCI Certified' },
  { icon: <Zap size={12} />, label: 'Instant Transfer' },
  { icon: <IndianRupee size={12} />, label: 'Zero Fees' },
];

// ── UPI App Button (reusable) ─────────────────────────────────────────────────
function UpiBtn({ href, abbr, label, color, bg, border }: {
  href: string; abbr: string; label: string; color: string; bg: string; border: string;
}) {
  return (
    <a href={href} className="upi-app-btn" style={{ background: bg, borderColor: border }}>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
        {abbr}
      </span>
      {label}
    </a>
  );
}

// ── Shimmer Skeleton ──────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
      <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 36, borderRadius: 8, width: '70%' }} />
      <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const UserPaymentPortal: React.FC<UserPaymentPortalProps> = ({
  merchantName, merchantUpiId, autoResetSeconds
}) => {
  const [payerName, setPayerName]         = useState('');
  const [amount, setAmount]               = useState('');
  const [note, setNote]                   = useState('');
  const [session, setSession]             = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentReceivedPayload | null>(null);
  const [focusedField, setFocusedField]   = useState<string | null>(null);

  // Poll for payment status
  useEffect(() => {
    if (!session || session.status !== 'WAITING_FOR_PAYMENT') return;
    const poll = async () => {
      try {
        const res = await api.getSession(session.id);
        if (res.success && res.data?.status === 'PAYMENT_RECEIVED') {
          setSession(res.data);
          setPaymentSuccess({
            sessionId: res.data.id,
            amount: res.data.amount,
            currency: 'INR',
            transactionId: 'VERIFIED_ON_LEDGER',
            payerName: payerName || 'Member',
            appSource: 'UPI',
            detectionSource: 'system',
            timestamp: new Date().toISOString()
          });
        }
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [session, payerName]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError('Please enter a valid amount (minimum ₹1)'); return; }
    if (!payerName.trim())            { setError('Please enter your full name'); return; }
    setIsLoading(true);
    try {
      const fullNote = `${payerName.trim()}${note.trim() ? ` - ${note.trim()}` : ''}`;
      const res = await api.createSession(numAmount, fullNote);
      if (res.success && res.data) setSession(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSession(null); setPaymentSuccess(null);
    setAmount(''); setPayerName(''); setNote('');
  };

  // ── State 1: Success ───────────────────────────────────────────────────────
  if (paymentSuccess || session?.status === 'PAYMENT_RECEIVED') {
    const successData: PaymentReceivedPayload = paymentSuccess || {
      sessionId: session?.id || 'manual',
      amount: session?.amount || parseFloat(amount) || 0,
      currency: 'INR', transactionId: 'VERIFIED',
      payerName: payerName || 'Member', appSource: 'UPI',
      detectionSource: 'system', timestamp: new Date().toISOString()
    };
    return (
      <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', padding: '32px' }}>
        <SuccessCelebration data={successData} autoResetSeconds={autoResetSeconds || 10} onReset={handleReset} />
      </div>
    );
  }

  // ── State 2: QR + 1-Tap ────────────────────────────────────────────────────
  if (session && session.status === 'WAITING_FOR_PAYMENT') {
    const upiQuery   = session.upi_uri.replace(/^upi:\/\/pay\?/, '').replace(/%40/g, '@');
    const gpayUri    = `tez://upi/pay?${upiQuery}`;
    const phonepeUri = `phonepe://pay?${upiQuery}`;
    const paytmUri   = `paytmmp://upi/pay?${upiQuery}`;
    const cleanUri   = `upi://pay?${upiQuery}`;

    return (
      <div className="glass-card animate-fade-scale" style={{ maxWidth: '480px', margin: '0 auto', padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '6px 16px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px' }}>
          <Sparkles size={14} /> Pay to {merchantName || 'MGOCSM Jaipur'}
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Contribution by <strong style={{ color: '#f8fafc' }}>{payerName}</strong>
        </div>

        <div className="display-amount-badge" style={{ fontSize: '2.8rem', margin: '8px 0 20px 0' }}>
          <span className="currency-symbol">₹</span>
          {session.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* QR */}
        <div className="qr-frame-wrapper pulsing-border" style={{ margin: '0 auto 20px auto', position: 'relative' }}>
          <QRCodeSVG
            value={session.upi_uri}
            size={220} level="H" includeMargin={false}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
              x: undefined, y: undefined, height: 26, width: 26, excavate: true
            }}
          />
          <div className="qr-scan-line" />
        </div>

        <div style={{ fontSize: '0.875rem', color: '#f8fafc', fontWeight: 600, marginBottom: '16px' }}>
          Scan with Google Pay, PhonePe, Paytm or BHIM
        </div>

        {/* 1-Tap buttons */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Or Tap to Pay Directly:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <UpiBtn href={gpayUri}    abbr="G"   label="Google Pay" color="#4285F4" bg="rgba(66,133,244,0.12)"  border="rgba(66,133,244,0.35)"  />
            <UpiBtn href={phonepeUri} abbr="Pe"  label="PhonePe"    color="#5f259f" bg="rgba(95,37,159,0.18)"   border="rgba(95,37,159,0.4)"    />
            <UpiBtn href={paytmUri}   abbr="P"   label="Paytm"      color="#00b9f5" bg="rgba(0,185,245,0.12)"   border="rgba(0,185,245,0.35)"   />
            <UpiBtn href={cleanUri}   abbr="UPI" label="Any UPI"    color="#10b981" bg="rgba(16,185,129,0.12)"  border="rgba(16,185,129,0.35)"  />
          </div>
        </div>

        <button type="button" className="btn-secondary" onClick={handleReset} style={{ width: '100%', fontSize: '0.85rem' }}>
          ← Change Amount / Name
        </button>
      </div>
    );
  }

  // ── State 3: Entry Form ────────────────────────────────────────────────────
  return (
    <div className="glass-card animate-fade-scale" style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 32px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '26px' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', boxShadow: '0 10px 28px rgba(16,185,129,0.4)', color: '#fff'
        }}>
          <Heart size={28} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          {merchantName || 'MGOCSM Jaipur'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>
          Enter your name and contribution amount to pay via UPI.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', padding: '10px 14px', borderRadius: 10,
          fontSize: '0.83rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Full Name *
          </label>
          <div style={{ position: 'relative' }}>
            <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: focusedField === 'name' ? '#10b981' : 'var(--text-muted)', transition: 'color 0.2s' }} />
            <input
              type="text" required
              placeholder="e.g. Mathew Varghese"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              className="form-input"
              style={{ paddingLeft: '42px', borderColor: focusedField === 'name' ? '#10b981' : undefined, boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(16,185,129,0.1)' : undefined }}
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Amount (₹) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 900, fontSize: '1.2rem', pointerEvents: 'none' }}>₹</span>
            <input
              type="number" min="1" step="any" required
              placeholder="Enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => setFocusedField('amount')}
              onBlur={() => setFocusedField(null)}
              className="form-input"
              style={{ paddingLeft: '42px', fontSize: '1.2rem', fontWeight: 800, borderColor: focusedField === 'amount' ? '#10b981' : 'rgba(16,185,129,0.25)', boxShadow: focusedField === 'amount' ? '0 0 0 3px rgba(16,185,129,0.1)' : undefined }}
            />
          </div>

          {/* Quick amount chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {QUICK_AMOUNTS.map((amt) => {
              const isSelected = amount === String(amt);
              return (
                <button
                  key={amt} type="button"
                  onClick={() => setAmount(String(amt))}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
                    color: isSelected ? '#fff' : '#94a3b8',
                    border: `1px solid ${isSelected ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s var(--ease-bounce)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.4)' : 'none',
                    fontFamily: 'var(--font-main)'
                  }}
                >
                  ₹{amt >= 1000 ? `${amt/1000}K` : amt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Purpose / Note <span style={{ opacity: 0.5, fontWeight: 500 }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Registration / Youth Camp / Donation"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setFocusedField('note')}
            onBlur={() => setFocusedField(null)}
            className="form-input"
            style={{ borderColor: focusedField === 'note' ? 'rgba(99,102,241,0.5)' : undefined, boxShadow: focusedField === 'note' ? '0 0 0 3px rgba(99,102,241,0.1)' : undefined }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          style={{ marginTop: '4px', fontSize: '1rem' }}
        >
          {isLoading ? (
            <><span className="spin-anim" style={{ display: 'inline-block' }}>⟳</span> Generating QR...</>
          ) : (
            <>Proceed to Pay <ArrowRight size={18} /></>
          )}
        </button>
      </form>

      {/* Trust badges */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          Direct bank transfer to <strong style={{ color: '#cbd5e1' }}>{merchantUpiId}</strong>
        </div>
        <div className="trust-badges-row">
          {TRUST_BADGES.map(({ icon, label }) => (
            <div key={label} className="trust-badge">
              <span style={{ color: '#10b981' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
