import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Heart, User, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { PaymentSession, PaymentReceivedPayload } from '../types';
import { SuccessCelebration } from './SuccessCelebration';

interface UserPaymentPortalProps {
  merchantName: string;
  merchantUpiId: string;
  autoResetSeconds: number;
  onPaymentSuccess?: (payload: PaymentReceivedPayload) => void;
}

export const UserPaymentPortal: React.FC<UserPaymentPortalProps> = ({
  merchantName,
  merchantUpiId,
  autoResetSeconds
}) => {
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentReceivedPayload | null>(null);

  const quickAmounts = [50, 100, 250, 500, 1000, 2000, 5000];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount (minimum ₹1)');
      return;
    }

    if (!payerName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      const fullNote = `${payerName.trim()}${note.trim() ? ` - ${note.trim()}` : ''}`;
      const res = await api.createSession(numAmount, fullNote);
      if (res.success && res.data) {
        setSession(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setPaymentSuccess(null);
    setAmount('');
    setPayerName('');
    setNote('');
  };

  // State 1: Payment Success
  if (paymentSuccess || session?.status === 'PAYMENT_RECEIVED') {
    const successData: PaymentReceivedPayload = paymentSuccess || {
      sessionId: session?.id || 'manual',
      amount: session?.amount || parseFloat(amount) || 0,
      currency: 'INR',
      transactionId: 'VERIFIED',
      payerName: payerName || 'Devotee / Member',
      appSource: 'UPI',
      detectionSource: 'system',
      timestamp: new Date().toISOString()
    };

    return (
      <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', padding: '32px' }}>
        <SuccessCelebration
          data={successData}
          autoResetSeconds={autoResetSeconds || 10}
          onReset={handleReset}
        />
      </div>
    );
  }

  // State 2: QR & 1-Tap UPI Apps Screen
  if (session && session.status === 'WAITING_FOR_PAYMENT') {
    const upiQuery = session.upi_uri.replace(/^upi:\/\/pay\?/, '').replace(/%40/g, '@');
    const gpayUri = `tez://upi/pay?${upiQuery}`;
    const phonepeUri = `phonepe://pay?${upiQuery}`;
    const paytmUri = `paytmmp://upi/pay?${upiQuery}`;
    const cleanUpiUri = `upi://pay?${upiQuery}`;

    return (
      <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>
          <Sparkles size={16} /> Pay to {merchantName || 'MGOCSM Jaipur'}
        </div>

        <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Contribution by <strong>{payerName}</strong>
        </div>

        <div className="display-amount-badge" style={{ fontSize: '2.8rem', margin: '8px 0 20px 0' }}>
          <span className="currency-symbol">₹</span>
          {session.amount.toFixed(2)}
        </div>

        {/* QR Code */}
        <div className="qr-frame-wrapper pulsing-border" style={{ margin: '0 auto 20px auto' }}>
          <QRCodeSVG
            value={session.upi_uri}
            size={220}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f172a'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
              x: undefined,
              y: undefined,
              height: 26,
              width: 26,
              excavate: true
            }}
          />
        </div>

        <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600, marginBottom: '16px' }}>
          Scan with Google Pay, PhonePe, Paytm, or BHIM
        </div>

        {/* 1-Tap App Buttons for Mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Or Tap to Pay Directly:
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
              href={cleanUpiUri}
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
              <span style={{ color: '#10b981', fontWeight: 900 }}>UPI</span> Any UPI
            </a>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleReset}
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
        >
          ← Change Amount / Name
        </button>
      </div>
    );
  }

  // State 3: User Entry Form (Default Screen)
  return (
    <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          color: '#ffffff'
        }}>
          <Heart size={28} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
          {merchantName || 'MGOCSM Jaipur'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Enter your name and custom amount to contribute via UPI.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          marginBottom: '18px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Name Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            YOUR FULL NAME *
          </label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              required
              placeholder="e.g. Mathew Varghese"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 14px 12px 42px',
                color: '#f8fafc',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            AMOUNT (₹) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 900, fontSize: '1.2rem' }}>₹</span>
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder="Enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                padding: '12px 14px 12px 42px',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                outline: 'none'
              }}
            />
          </div>

          {/* Quick Amount Selection Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(String(amt))}
                style={{
                  background: amount === String(amt) ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                  color: amount === String(amt) ? '#022c22' : '#f1f5f9',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Purpose Note */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            PURPOSE / NOTE (OPTIONAL)
          </label>
          <input
            type="text"
            placeholder="e.g. Registration / Youth Camp / Donation"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px' }}
        >
          {isLoading ? 'Generating QR...' : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Proceed to Pay <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <ShieldCheck size={16} style={{ color: '#10b981' }} /> Direct bank transfer to <strong>{merchantUpiId}</strong>
      </div>
    </div>
  );
};
