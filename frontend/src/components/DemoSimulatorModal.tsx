import React, { useState } from 'react';
import { X, Play, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Zap, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface DemoSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAmount?: number;
}

interface ScenarioBtn {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  action: () => void;
}

export const DemoSimulatorModal: React.FC<DemoSimulatorModalProps> = ({
  isOpen, onClose, activeAmount
}) => {
  const [simAmount, setSimAmount] = useState<string>(activeAmount ? String(activeAmount) : '500');
  const [payerName, setPayerName] = useState<string>('Rahul Sharma');
  const [appSource, setAppSource] = useState<string>('Google Pay');
  const [customUtr, setCustomUtr] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async (customAmountOverride?: number, forceDuplicate?: boolean) => {
    setIsLoading(true);
    setFeedback(null);
    const scenarioLabel = forceDuplicate ? 'duplicate' : customAmountOverride !== undefined ? String(customAmountOverride) : simAmount;
    setLastTriggered(scenarioLabel);
    try {
      const amount = customAmountOverride !== undefined ? customAmountOverride : parseFloat(simAmount);
      const utr = forceDuplicate ? 'DEMO_DUP_UTR_423987123456' : (customUtr.trim() || undefined);
      const result = await api.simulatePayment(amount, payerName, appSource, utr);
      if (result.success) {
        setFeedback({ message: `✅ Simulated ₹${amount} received and verified via ${appSource}!`, isError: false });
      } else {
        setFeedback({ message: `⚠️ Rejected: ${result.message || result.status}`, isError: true });
      }
    } catch (err: any) {
      setFeedback({ message: `❌ Error: ${err.message || 'Simulation failed'}`, isError: true });
    } finally {
      setIsLoading(false);
      setLastTriggered(null);
    }
  };

  const scenarios: ScenarioBtn[] = [
    {
      label: 'Pay Exact Amount',
      sublabel: `₹${activeAmount || 500} — Success`,
      icon: <CheckCircle2 size={16} />,
      color: '#34d399', border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.1)',
      action: () => handleSimulate(activeAmount || 500)
    },
    {
      label: 'Wrong Amount',
      sublabel: '₹50 — Mismatch',
      icon: <AlertTriangle size={16} />,
      color: '#fbbf24', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)',
      action: () => handleSimulate(50)
    },
    {
      label: 'Duplicate UTR',
      sublabel: 'Fraud Test — Rejected',
      icon: <ShieldAlert size={16} />,
      color: '#f87171', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)',
      action: () => handleSimulate(activeAmount || 500, true)
    },
    {
      label: 'Quick ₹100',
      sublabel: 'Ad-hoc payment',
      icon: <Zap size={16} />,
      color: '#a78bfa', border: 'rgba(167,139,250,0.4)', bg: 'rgba(167,139,250,0.08)',
      action: () => handleSimulate(100)
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Demo Payment Simulator</h3>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.04em', marginTop: 1 }}>
                ⚡ SANDBOX — TEST ENVIRONMENT ONLY
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{
            background: feedback.isError ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            border: `1px solid ${feedback.isError ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
            borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '16px',
            fontSize: '0.85rem', fontWeight: 700,
            color: feedback.isError ? '#f87171' : '#34d399',
            animation: 'fade-scale 0.3s ease'
          }}>
            {feedback.message}
          </div>
        )}

        {/* Quick Scenario Cards */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Quick Test Scenarios
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {scenarios.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={isLoading}
                onClick={s.action}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: '4px', padding: '12px 14px',
                  background: s.bg, border: `1px solid ${s.border}`,
                  borderRadius: 'var(--radius-md)', cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1, transition: 'all 0.18s ease',
                  fontFamily: 'var(--font-main)', textAlign: 'left'
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ color: s.color, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.855rem' }}>
                  {isLoading && lastTriggered
                    ? <RefreshCw size={14} className="spin-anim" />
                    : s.icon}
                  {s.label}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-card)', margin: '4px 0 16px' }} />

        {/* Custom Parameters */}
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Custom Parameters
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-input" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">App Source</label>
            <select className="form-input" value={appSource} onChange={(e) => setAppSource(e.target.value)}>
              <option>Google Pay</option>
              <option>PhonePe</option>
              <option>Paytm</option>
              <option>BHIM UPI</option>
              <option>Amazon Pay</option>
              <option>HDFC Bank SMS</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Payer Name</label>
            <input type="text" className="form-input" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Custom UTR (optional)</label>
            <input type="text" className="form-input" placeholder="Random if blank" value={customUtr} onChange={(e) => setCustomUtr(e.target.value)} />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => handleSimulate()}
          disabled={isLoading || !simAmount}
          type="button"
        >
          {isLoading
            ? <><RefreshCw size={16} className="spin-anim" /> Triggering...</>
            : <><Play size={16} /> Trigger Simulated Payment — ₹{simAmount || '0'}</>
          }
        </button>
      </div>
    </div>
  );
};
