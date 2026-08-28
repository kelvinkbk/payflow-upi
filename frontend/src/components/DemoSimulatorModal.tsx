import React, { useState } from 'react';
import { X, Play, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface DemoSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAmount?: number;
}

export const DemoSimulatorModal: React.FC<DemoSimulatorModalProps> = ({
  isOpen,
  onClose,
  activeAmount
}) => {
  const [simAmount, setSimAmount] = useState<string>(activeAmount ? String(activeAmount) : '500');
  const [payerName, setPayerName] = useState<string>('Rahul Sharma');
  const [appSource, setAppSource] = useState<string>('Google Pay');
  const [customUtr, setCustomUtr] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSimulate = async (customAmountOverride?: number, forceDuplicate?: boolean) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const amountToUse = customAmountOverride !== undefined ? customAmountOverride : parseFloat(simAmount);
      const utrToUse = forceDuplicate ? 'DEMO_DUP_UTR_423987123456' : (customUtr.trim() || undefined);

      const result = await api.simulatePayment(amountToUse, payerName, appSource, utrToUse);

      if (result.success) {
        setFeedback({
          message: `✅ Simulation Success: Payment of ₹${amountToUse} received and verified!`,
          isError: false
        });
      } else {
        setFeedback({
          message: `⚠️ Simulation Rejected: ${result.message || 'Status: ' + result.status}`,
          isError: true
        });
      }
    } catch (err: any) {
      setFeedback({
        message: `❌ Error: ${err.message || 'Failed to trigger simulation'}`,
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} style={{ color: '#f59e0b' }} />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Demo Payment Simulator</h3>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                TEST ENVIRONMENT ONLY (SANDBOX)
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {feedback && (
          <div style={{
            background: feedback.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${feedback.isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: feedback.isError ? '#f87171' : '#34d399'
          }}>
            {feedback.message}
          </div>
        )}

        {/* Quick Test Scenario Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Quick Test Scenarios:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleSimulate(activeAmount || 500)}
              disabled={isLoading}
              style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.85rem' }}
            >
              <CheckCircle2 size={16} />
              Pay Exact Amount (₹{activeAmount || 500})
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleSimulate(50)}
              disabled={isLoading}
              style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontSize: '0.85rem' }}
            >
              <AlertTriangle size={16} />
              Mismatch (Pay ₹50)
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleSimulate(activeAmount || 500, true)}
              disabled={isLoading}
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', fontSize: '0.85rem' }}
            >
              <ShieldAlert size={16} />
              Duplicate UTR Test
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleSimulate(100)}
              disabled={isLoading}
              style={{ fontSize: '0.85rem' }}
            >
              <Play size={16} />
              Pay ₹100
            </button>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-card)', margin: '16px 0' }} />

        {/* Custom Parameters Form */}
        <div className="form-group">
          <label className="form-label">Simulated Amount (₹):</label>
          <input
            type="number"
            className="form-input"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payer Name:</label>
          <input
            type="text"
            className="form-input"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">App Source:</label>
          <select
            className="form-input"
            value={appSource}
            onChange={(e) => setAppSource(e.target.value)}
          >
            <option value="Google Pay">Google Pay</option>
            <option value="PhonePe">PhonePe</option>
            <option value="Paytm">Paytm</option>
            <option value="BHIM UPI">BHIM UPI</option>
            <option value="Amazon Pay">Amazon Pay</option>
            <option value="HDFC Bank SMS">HDFC Bank SMS</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Custom UTR (Optional):</label>
          <input
            type="text"
            className="form-input"
            placeholder="Leave blank for random unique UTR"
            value={customUtr}
            onChange={(e) => setCustomUtr(e.target.value)}
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            className="btn-primary"
            onClick={() => handleSimulate()}
            disabled={isLoading || !simAmount}
            type="button"
          >
            <Play size={18} />
            {isLoading ? 'Triggering...' : 'Trigger Simulated Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
