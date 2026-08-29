import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, ShieldCheck, Sparkles, Share2 } from 'lucide-react';
import { PaymentReceivedPayload } from '../types';

interface SuccessCelebrationProps {
  data: PaymentReceivedPayload;
  autoResetSeconds: number;
  onReset: () => void;
}

// ── Animated Count-Up ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// ── Circular Ring Timer ────────────────────────────────────────────────────────
function RingTimer({ seconds, total, onExpire }: { seconds: number; total: number; onExpire: () => void }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, seconds / total));
  const dash = circ * progress;

  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={seconds < 3 ? '#ef4444' : '#10b981'}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dasharray 1s linear, stroke 0.4s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800,
        fontFamily: 'var(--font-mono)', color: seconds < 3 ? '#f87171' : '#10b981'
      }}>
        {seconds}s
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  data, autoResetSeconds, onReset
}) => {
  const [timeLeft, setTimeLeft] = useState(autoResetSeconds);
  const displayAmount = useCountUp(data.amount, 1000);

  // Confetti burst
  useEffect(() => {
    try {
      const end = Date.now() + 1500;
      const colors = ['#10b981', '#34d399', '#06b6d4', '#fbbf24', '#a78bfa', '#ffffff'];
      (function frame() {
        confetti({ particleCount: 5, angle: 60,  spread: 60, origin: { x: 0, y: 0.65 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.65 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      // Second burst at 600ms
      setTimeout(() => {
        confetti({ particleCount: 45, spread: 90, origin: { x: 0.5, y: 0.5 }, colors, scalar: 1.2 });
      }, 600);
    } catch (_) {}
  }, []);

  // Countdown timer
  useEffect(() => {
    setTimeLeft(autoResetSeconds);
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(id); onReset(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [autoResetSeconds, onReset]);

  const progressPercent = Math.max(0, (timeLeft / autoResetSeconds) * 100);

  const handleWhatsAppReceipt = () => {
    const msg = `✅ Payment Received!\nAmount: ₹${data.amount.toFixed(2)}\nFrom: ${data.payerName || 'Customer'}\nRef: ${data.transactionId}\nTime: ${new Date(data.timestamp || Date.now()).toLocaleTimeString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="success-screen-container">
      {/* Animated check badge */}
      <div className="success-icon-badge">
        <Check size={60} strokeWidth={3.5} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#10b981', fontWeight: 800 }}>
        <Sparkles size={18} />
        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.82rem' }}>
          Instant Payment Verified
        </span>
      </div>

      <h1 className="success-title">Payment Received</h1>

      {/* Count-up Amount */}
      <div className="success-amount">
        <span style={{ fontSize: '2.8rem', color: '#10b981', marginRight: '4px' }}>₹</span>
        {displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* Receipt-style card with PAID stamp */}
      <div className="success-details-card">
        <div className="paid-stamp">PAID</div>

        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-val" style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={14} /> Successful
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Transaction ID</span>
          <span className="detail-val" style={{ fontSize: '0.78rem', letterSpacing: '0.04em', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          <span className="detail-label">Method</span>
          <span className="detail-val" style={{ color: '#38bdf8' }}>
            {data.appSource || 'UPI'}{data.bankName ? ` (${data.bankName})` : ''}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Time</span>
          <span className="detail-val">
            {new Date(data.timestamp || Date.now()).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* WhatsApp receipt share */}
      <button
        type="button"
        className="btn-secondary"
        onClick={handleWhatsAppReceipt}
        style={{ borderColor: 'rgba(37,211,102,0.35)', color: '#25D366', fontSize: '0.82rem', padding: '8px 16px' }}
      >
        <Share2 size={14} /> Share Receipt via WhatsApp
      </button>

      {/* Countdown + next customer */}
      <div className="countdown-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '7px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RingTimer seconds={timeLeft} total={autoResetSeconds} onExpire={onReset} />
            <span>Returning to next customer in <strong style={{ color: '#f8fafc' }}>{timeLeft}s</strong></span>
          </div>
          <button
            onClick={onReset}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--font-main)' }}
          >
            Next →
          </button>
        </div>
        <div className="countdown-bar-bg">
          <div className="countdown-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
};
