import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { PaymentReceivedPayload } from '../types';

interface SuccessCelebrationProps {
  data: PaymentReceivedPayload;
  autoResetSeconds: number;
  onReset: () => void;
}

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  data,
  autoResetSeconds,
  onReset
}) => {
  const [timeLeft, setTimeLeft] = useState(autoResetSeconds);

  // Trigger high quality confetti burst
  useEffect(() => {
    try {
      const end = Date.now() + 1200;
      const colors = ['#10b981', '#34d399', '#06b6d4', '#fbbf24', '#ffffff'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    } catch (e) {
      // Ignored
    }
  }, []);

  // Countdown timer for auto-reset
  useEffect(() => {
    setTimeLeft(autoResetSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoResetSeconds, onReset]);

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / autoResetSeconds) * 100));

  return (
    <div className="success-screen-container">
      {/* Animated Check Icon */}
      <div className="success-icon-badge">
        <Check size={64} strokeWidth={3.5} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800 }}>
        <Sparkles size={20} />
        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.9rem' }}>Instant Payment Verified</span>
      </div>

      <h1 className="success-title">Payment Received</h1>

      <div className="success-amount">
        <span style={{ fontSize: '2.8rem', color: '#10b981', marginRight: '4px' }}>₹</span>
        {data.amount.toFixed(2)}
      </div>

      {/* Transaction Metadata Card */}
      <div className="success-details-card">
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-val" style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={16} /> Transaction Successful
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Transaction ID / UTR</span>
          <span className="detail-val" style={{ color: '#ffffff', letterSpacing: '0.04em' }}>
            {data.transactionId}
          </span>
        </div>

        {data.payerName && (
          <div className="detail-row">
            <span className="detail-label">Payer</span>
            <span className="detail-val">{data.payerName}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="detail-label">Payment Method</span>
          <span className="detail-val" style={{ color: '#38bdf8' }}>
            {data.appSource || 'UPI'} {data.bankName ? `(${data.bankName})` : ''}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Time</span>
          <span className="detail-val">
            {new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Auto Reset Progress Bar */}
      <div className="countdown-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span>Returning to next customer in {timeLeft}s</span>
          <button 
            onClick={onReset}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          >
            Next Customer Now &rarr;
          </button>
        </div>
        <div className="countdown-bar-bg">
          <div className="countdown-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
};
