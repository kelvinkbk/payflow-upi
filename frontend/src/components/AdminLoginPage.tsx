import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onCancel
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    } catch (err: any) {
      setError('Connection failed. Please verify server is active.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '36px 28px' }} className="glass-card">
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
        }}>
          <Lock size={28} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
          Admin Login
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Sign in to access POS Counter, transactions ledger, and reports.
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
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Username */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            USERNAME
          </label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              required
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

        {/* Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              autoFocus
              required
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 14px 12px 42px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
          >
            ← Back to Public Site
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
          >
            {isLoading ? 'Signing In...' : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Sign In <ArrowRight size={16} />
              </span>
            )}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        <ShieldCheck size={16} style={{ color: '#3b82f6' }} /> Encrypted Server Authentication
      </div>
    </div>
  );
};
