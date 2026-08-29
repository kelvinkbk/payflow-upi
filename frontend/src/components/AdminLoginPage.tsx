import React, { useState, useRef } from 'react';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.adminLogin(username.trim(), password.trim());
      if (res.success && res.adminToken) {
        sessionStorage.setItem('payflow_admin_token', res.adminToken);
        sessionStorage.setItem('payflow_admin_auth', 'true');
        onSuccess();
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
        setShake(true);
        setTimeout(() => setShake(false), 650);
      }
    } catch {
      setError('Connection failed. Please verify the server is active.');
      setShake(true);
      setTimeout(() => setShake(false), 650);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="glass-card animate-fade-scale"
      style={{
        maxWidth: '420px', margin: '40px auto', padding: '40px 32px',
        animation: shake ? 'shake 0.55s ease' : undefined
      }}
    >
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(2px); }
        }
      `}</style>

      {/* Icon + Title */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: 62, height: 62, borderRadius: 20,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(59,130,246,0.4), 0 0 0 8px rgba(59,130,246,0.08)'
        }}>
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Admin Login
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Sign in to access the POS counter, ledger, and reports.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', padding: '11px 14px', borderRadius: 10,
          fontSize: '0.83rem', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fade-scale 0.3s ease'
        }}>
          🔒 {error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Username */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <User size={17} style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: focusedField === 'user' ? '#3b82f6' : 'var(--text-muted)', transition: 'color 0.2s'
            }} />
            <input
              type="text" required
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('user')}
              onBlur={() => setFocusedField(null)}
              className="form-input"
              style={{
                paddingLeft: '42px',
                borderColor: focusedField === 'user' ? '#3b82f6' : undefined,
                boxShadow: focusedField === 'user' ? '0 0 0 3px rgba(59,130,246,0.12)' : undefined
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={17} style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: focusedField === 'pass' ? '#3b82f6' : 'var(--text-muted)', transition: 'color 0.2s'
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus required
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
              className="form-input"
              style={{
                paddingLeft: '42px', paddingRight: '44px',
                borderColor: focusedField === 'pass' ? '#3b82f6' : undefined,
                boxShadow: focusedField === 'pass' ? '0 0 0 3px rgba(59,130,246,0.12)' : undefined
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
                transition: 'color 0.15s'
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isLoading || !password}
            style={{
              flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-main)',
              cursor: isLoading || !password ? 'not-allowed' : 'pointer',
              opacity: !password ? 0.55 : 1,
              boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? (
              <><span className="spin-anim" style={{ display: 'inline-block', fontSize: '1rem' }}>⟳</span> Signing In...</>
            ) : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '22px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        <ShieldCheck size={14} style={{ color: '#3b82f6' }} />
        Encrypted server authentication · Session expires on close
      </div>
    </div>
  );
};
