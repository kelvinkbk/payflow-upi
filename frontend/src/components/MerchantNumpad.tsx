import React, { useState } from 'react';
import { Delete, QrCode, XCircle, Sparkles } from 'lucide-react';

interface MerchantNumpadProps {
  onGenerate: (amount: number, note?: string) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
  hasActiveSession: boolean;
}

export const MerchantNumpad: React.FC<MerchantNumpadProps> = ({
  onGenerate,
  onCancel,
  isLoading,
  hasActiveSession
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const quickAmounts = [10, 50, 100, 200, 500, 1000, 1500, 2000];

  const handleDigit = (digit: string) => {
    if (digit === '.' && amountStr.includes('.')) return;
    if (amountStr.includes('.') && amountStr.split('.')[1].length >= 2) return;
    if (amountStr.length >= 7) return; // Prevent excessive numbers
    setAmountStr((prev) => (prev === '0' && digit !== '.' ? digit : prev + digit));
  };

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    const total = current + val;
    setAmountStr(String(total));
  };

  const handleClear = () => {
    setAmountStr('');
  };

  const handleBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleGenerate = () => {
    const val = parseFloat(amountStr);
    if (!isNaN(val) && val > 0) {
      onGenerate(val, note.trim() || undefined);
    }
  };

  const currentNum = parseFloat(amountStr) || 0;

  return (
    <div className="glass-card numpad-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Counter Control</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick Numpad</span>
      </div>

      {/* Amount Display with Currency */}
      <div className="amount-input-display">
        <span style={{ fontSize: '1.8rem', color: '#10b981', fontWeight: 900 }}>₹</span>
        <span className="amount-input-val">
          {amountStr ? amountStr : '0.00'}
        </span>
        {amountStr && (
          <button 
            onClick={handleClear}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <Delete size={20} />
          </button>
        )}
      </div>

      {/* Quick Increment Chips */}
      <div className="quick-chips-grid">
        {quickAmounts.map((q) => (
          <button
            key={q}
            className="chip-btn"
            onClick={() => handleQuickAdd(q)}
            type="button"
          >
            +{q}
          </button>
        ))}
      </div>

      {/* 3x4 Numpad */}
      <div className="numpad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '.'].map((key) => (
          <button
            key={key}
            className="numpad-btn"
            onClick={() => handleDigit(key)}
            type="button"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
        {hasActiveSession ? (
          <button
            className="btn-secondary btn-danger"
            onClick={onCancel}
            disabled={isLoading}
            style={{ flex: 1 }}
            type="button"
          >
            <XCircle size={18} />
            Cancel QR
          </button>
        ) : null}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={isLoading || currentNum <= 0}
          style={{ opacity: currentNum <= 0 ? 0.5 : 1, flex: 2 }}
          type="button"
        >
          <QrCode size={20} />
          {hasActiveSession ? 'Update QR Code' : 'Generate QR Code'}
        </button>
      </div>
    </div>
  );
};
