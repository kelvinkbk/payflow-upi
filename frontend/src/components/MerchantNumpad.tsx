import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Delete, QrCode, XCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface MerchantNumpadProps {
  onGenerate: (amount: number, note?: string) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
  hasActiveSession: boolean;
}

const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000, 1500, 2000];
const RECENT_AMOUNTS_KEY = 'payflow_recent_amounts';
const MAX_RECENT = 4;

function formatAmount(str: string): string {
  if (!str) return '';
  const [int, dec] = str.split('.');
  const formatted = parseInt(int || '0', 10).toLocaleString('en-IN');
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function getRecentAmounts(): number[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_AMOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentAmount(amount: number) {
  const prev = getRecentAmounts().filter((a) => a !== amount);
  localStorage.setItem(RECENT_AMOUNTS_KEY, JSON.stringify([amount, ...prev].slice(0, MAX_RECENT)));
}

export const MerchantNumpad: React.FC<MerchantNumpadProps> = ({
  onGenerate, onCancel, isLoading, hasActiveSession
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [recentAmounts, setRecentAmounts] = useState<number[]>(getRecentAmounts);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentNum = parseFloat(amountStr) || 0;

  // ── Keyboard support ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle when focused within the numpad or no focused input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key >= '0' && e.key <= '9') { handleDigit(e.key); setPressedKey(e.key); setTimeout(() => setPressedKey(null), 180); }
      else if (e.key === '.') { handleDigit('.'); }
      else if (e.key === 'Backspace') { handleBackspace(); }
      else if (e.key === 'Escape') { handleClear(); }
      else if (e.key === 'Enter') { handleGenerate(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [amountStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDigit = useCallback((digit: string) => {
    if (digit === '.' && amountStr.includes('.')) return;
    if (amountStr.includes('.') && amountStr.split('.')[1]?.length >= 2) return;
    if (amountStr.replace('.', '').length >= 7) return;
    setAmountStr((prev) => prev === '0' && digit !== '.' ? digit : prev + digit);
  }, [amountStr]);

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + val));
  };

  const handleClear = () => setAmountStr('');
  const handleBackspace = () => setAmountStr((prev) => prev.slice(0, -1));

  const handleGenerate = () => {
    const val = parseFloat(amountStr);
    if (!isNaN(val) && val > 0) {
      saveRecentAmount(val);
      setRecentAmounts(getRecentAmounts());
      onGenerate(val, note.trim() || undefined);
    }
  };

  // ── Ripple helper ─────────────────────────────────────────────────────────
  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 520);
  };

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '.'];

  return (
    <div className="glass-card numpad-container" ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
          Counter Control
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 7px' }}>
            Numpad
          </span>
          <span className="kbd" title="Press Enter to generate">↵</span>
        </div>
      </div>

      {/* Amount Display */}
      <div className={`amount-input-display ${amountStr ? 'has-value' : ''}`}>
        <span style={{ fontSize: '1.9rem', color: amountStr ? '#10b981' : 'var(--text-muted)', fontWeight: 900, transition: 'color 0.2s' }}>₹</span>
        <span className={`amount-input-val${!amountStr ? ' zero' : ''}`}>
          {amountStr ? formatAmount(amountStr) : '0.00'}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {amountStr && (
            <button
              onClick={handleBackspace}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: 6, transition: 'color 0.15s' }}
              title="Backspace"
            >
              <Delete size={18} />
            </button>
          )}
          {amountStr && (
            <button
              onClick={handleClear}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.15s' }}
              title="Clear all"
            >
              CLR
            </button>
          )}
        </div>
      </div>

      {/* Recent Amounts (if available) */}
      {recentAmounts.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} /> Recent
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {recentAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                className="chip-btn"
                onClick={() => setAmountStr(String(amt))}
                style={{ fontSize: '0.78rem', padding: '6px 10px', borderColor: amountStr === String(amt) ? 'rgba(16,185,129,0.5)' : undefined, color: amountStr === String(amt) ? '#34d399' : undefined }}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Increment Chips */}
      <div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>
          Quick Add
        </div>
        <div className="quick-chips-grid">
          {QUICK_AMOUNTS.map((q) => (
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
      </div>

      {/* 3×4 Numpad */}
      <div className="numpad-grid">
        {numpadKeys.map((key) => (
          <button
            key={key}
            className={`numpad-btn ripple-container${pressedKey === key ? ' pressed' : ''}`}
            onClick={(e) => { addRipple(e); handleDigit(key); setPressedKey(key); setTimeout(() => setPressedKey(null), 180); }}
            type="button"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Collapsible Note Field */}
      <div>
        <button
          type="button"
          onClick={() => setShowNote(!showNote)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, padding: '2px 0',
            fontFamily: 'var(--font-main)'
          }}
        >
          {showNote ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showNote ? 'Hide Note' : '+ Add Note / Description'}
        </button>
        <div className={`note-input-collapsible${showNote ? ' expanded' : ''}`}>
          <input
            type="text"
            placeholder="e.g. Registration / Youth Camp"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="form-input"
            style={{ marginTop: '8px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {hasActiveSession && (
          <button
            className="btn-secondary btn-danger ripple-container"
            onClick={(e) => { addRipple(e); onCancel(); }}
            disabled={isLoading}
            style={{ flex: 1 }}
            type="button"
          >
            <XCircle size={16} /> Cancel
          </button>
        )}
        <button
          className="btn-primary ripple-container"
          onClick={(e) => { addRipple(e); handleGenerate(); }}
          disabled={isLoading || currentNum <= 0}
          style={{ opacity: currentNum <= 0 ? 0.45 : 1, flex: hasActiveSession ? 2 : 1 }}
          type="button"
        >
          {isLoading ? (
            <>
              <span className="spin-anim" style={{ display: 'inline-block' }}>⟳</span>
              Generating...
            </>
          ) : (
            <>
              <QrCode size={18} />
              {hasActiveSession ? 'Update QR' : 'Generate QR'}
              {currentNum > 0 && (
                <span style={{ fontSize: '0.88rem', opacity: 0.8, fontWeight: 600 }}>
                  · ₹{currentNum.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-hint)', marginTop: '-4px' }}>
        <span className="kbd">0–9</span> type amount &nbsp;
        <span className="kbd">↵</span> generate &nbsp;
        <span className="kbd">Esc</span> clear
      </div>
    </div>
  );
};
