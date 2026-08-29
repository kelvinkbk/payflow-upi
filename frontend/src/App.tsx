import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import {
  QrCode,
  History,
  Settings as SettingsIcon,
  Smartphone,
  Maximize2,
  Minimize2,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  Layers,
  CreditCard,
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  Clock
} from 'lucide-react';
import { CustomerDisplay } from './components/CustomerDisplay';
import { MerchantNumpad } from './components/MerchantNumpad';
import { TransactionLedger } from './components/TransactionLedger';
import { UserPaymentPortal } from './components/UserPaymentPortal';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AndroidPairingModal } from './components/AndroidPairingModal';
import { DemoSimulatorModal } from './components/DemoSimulatorModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { useWebSocket } from './hooks/useWebSocket';
import { useSoundbox } from './hooks/useSoundbox';
import { api } from './services/api';
import { MerchantConfig, PaymentReceivedPayload, PaymentSession, Transaction, TransactionStats } from './types';
import './styles/app.css';

// ── Toast System ──────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
  dismissing?: boolean;
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} style={{ color: '#34d399' }} />,
  error:   <XCircle     size={20} style={{ color: '#f87171' }} />,
  warning: <AlertTriangle size={20} style={{ color: '#fbbf24' }} />,
  info:    <Info        size={20} style={{ color: '#38bdf8' }} />,
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}${t.dismissing ? ' dismissing' : ''}`}>
          <div className="toast-icon">{TOAST_ICONS[t.type]}</div>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(t.id)}>✕</button>
          <div
            className="toast-progress"
            style={{ animationDuration: `${t.duration}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Kolkata'
      }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="header-clock" title="Indian Standard Time">
      <Clock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: 'var(--text-muted)' }} />
      {time}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCustomerLink = Boolean(urlParams.get('session') || urlParams.get('amount') || urlParams.get('pay'));

  // Admin auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() =>
    sessionStorage.getItem('payflow_admin_auth') === 'true'
  );
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(() =>
    urlParams.get('admin') === 'true' && !sessionStorage.getItem('payflow_admin_auth')
  );

  const [activeAdminTab, setActiveAdminTab] = useState<'POS' | 'LEDGER' | 'PORTAL'>('POS');
  const [currentSession, setCurrentSession] = useState<PaymentSession | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<PaymentReceivedPayload | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({ totalCount: 0, totalVolume: 0, todayVolume: 0, todayCount: 0 });
  const [config, setConfig] = useState<MerchantConfig>({
    merchantName: 'MGOCSM Jaipur',
    merchantUpiId: 'mgocsmjaipur@nsdl',
    autoResetDelaySeconds: 7,
    sessionTimeoutSeconds: 300,
    soundboxVoiceEnabled: true,
    soundboxLanguage: 'en-IN',
    soundboxVolume: 1.0,
    androidDeviceToken: 'upi_secure_token_987654321'
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, message = '', duration = 4500) => {
    const id = `toast-${++toastCounter.current}`;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, dismissing: true } : t));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 320);
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, dismissing: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 320);
  }, []);

  const { announcePayment } = useSoundbox();

  // ── Load Initial Data ─────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      const url = new URLSearchParams(window.location.search);
      const querySessionId = url.get('session') || url.get('id');
      const queryAmount = url.get('amount') || url.get('amt') || url.get('pay');
      const queryNote = url.get('note') || url.get('desc');

      if (querySessionId) {
        const [cfgRes, sessionRes] = await Promise.all([
          api.getConfig(),
          api.getSession(querySessionId).catch(() => ({ success: false, data: null }))
        ]);
        if (cfgRes.success) setConfig(cfgRes.data);
        if (sessionRes.success && sessionRes.data) setCurrentSession(sessionRes.data);
        return;
      }

      if (queryAmount) {
        const amountNum = parseFloat(queryAmount);
        if (!isNaN(amountNum) && amountNum > 0) {
          const [cfgRes, sessionRes] = await Promise.all([
            api.getConfig(),
            api.createSession(amountNum, queryNote || undefined).catch(() => ({ success: false, data: null }))
          ]);
          if (cfgRes.success) setConfig(cfgRes.data);
          if (sessionRes.success && sessionRes.data) setCurrentSession(sessionRes.data);
          return;
        }
      }

      const [cfgRes, sessionRes, txRes] = await Promise.all([
        api.getConfig(),
        api.getCurrentSession(),
        api.getTransactions({ limit: 50 })
      ]);

      if (cfgRes.success) setConfig(cfgRes.data);
      if (sessionRes.success && sessionRes.data) setCurrentSession(sessionRes.data);
      if (txRes.success) {
        setTransactions(txRes.data);
        setStats(txRes.stats);
      }
    } catch (err) {
      console.warn('Initial data fetch error:', err);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ── Background Sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        if (isAdminLoggedIn) {
          const txRes = await api.getTransactions({ limit: 50 });
          if (txRes.success) {
            setTransactions(txRes.data);
            setStats(txRes.stats);
          }
        }

        if (currentSession && currentSession.status === 'WAITING_FOR_PAYMENT') {
          const sRes = await api.getSession(currentSession.id).catch(() => api.getCurrentSession());
          if (sRes.success && sRes.data && sRes.data.status === 'PAYMENT_RECEIVED') {
            setCurrentSession(sRes.data);
            setPaymentSuccessData({
              sessionId: sRes.data.id,
              amount: sRes.data.amount,
              currency: 'INR',
              transactionId: 'VERIFIED_ON_LEDGER',
              payerName: 'UPI Customer',
              appSource: 'UPI',
              detectionSource: 'system',
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (_) { /* silent */ }
    }, 3500);
    return () => clearInterval(syncInterval);
  }, [isAdminLoggedIn, currentSession]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key.toLowerCase()) {
        case 'f': toggleFullscreen(); break;
        case 'm': setIsMuted((v) => !v); break;
        case '1': setActiveAdminTab('POS'); break;
        case '2': setActiveAdminTab('LEDGER'); break;
        case '3': setActiveAdminTab('PORTAL'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdminLoggedIn]);

  // ── Payment Handlers ──────────────────────────────────────────────────────
  const handlePaymentReceived = useCallback((data: PaymentReceivedPayload) => {
    setPaymentSuccessData(data);
    setCurrentSession((prev) => prev ? { ...prev, status: 'PAYMENT_RECEIVED' } : null);

    if (config.soundboxVoiceEnabled && !isMuted) {
      announcePayment(data.amount, data.appSource || 'UPI', config.soundboxLanguage);
    }

    addToast('success', `₹${data.amount.toFixed(2)} Received!`,
      `${data.payerName || 'Customer'} via ${data.appSource || 'UPI'}`);

    api.getTransactions({ limit: 50 }).then((res) => {
      if (res.success) { setTransactions(res.data); setStats(res.stats); }
    }).catch(console.error);
  }, [config.soundboxVoiceEnabled, config.soundboxLanguage, isMuted, announcePayment, addToast]);

  const handleUnsolicitedPayment = useCallback((data: PaymentReceivedPayload) => {
    addToast('warning', 'Payment Outside Session',
      `₹${data.amount.toFixed(2)} from ${data.payerName || 'UPI Customer'} (Ref: ${data.transactionId})`,
      7000);

    if (config.soundboxVoiceEnabled && !isMuted) {
      announcePayment(data.amount, data.appSource || 'UPI', config.soundboxLanguage);
    }

    api.getTransactions({ limit: 50 }).then((res) => {
      if (res.success) { setTransactions(res.data); setStats(res.stats); }
    }).catch(console.error);
  }, [config.soundboxVoiceEnabled, config.soundboxLanguage, isMuted, announcePayment, addToast]);

  const handleSessionCreated = useCallback((session: PaymentSession) => {
    setCurrentSession(session);
    setPaymentSuccessData(null);
  }, []);

  const handleSessionStateChange = useCallback((session: PaymentSession | null) => {
    setCurrentSession(session);
    if (!session) setPaymentSuccessData(null);
  }, []);

  const { isConnected } = useWebSocket({
    onPaymentReceived: handlePaymentReceived,
    onSessionCreated: handleSessionCreated,
    onSessionCancelled: () => handleSessionStateChange(null),
    onAmountMismatch: handleUnsolicitedPayment
  });

  // ── POS Actions ───────────────────────────────────────────────────────────
  const handleGenerateSession = async (amount: number, note?: string) => {
    setIsLoading(true);
    try {
      const res = await api.createSession(amount, note);
      if (res.success) {
        setCurrentSession(res.data);
        setPaymentSuccessData(null);
      }
    } catch (err: any) {
      addToast('error', 'Error Generating QR', err.message || 'Could not generate UPI QR code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSession = async () => {
    setIsLoading(true);
    try {
      await api.cancelSession();
      setCurrentSession(null);
      setPaymentSuccessData(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToReady = async () => {
    try {
      await api.resetSession();
      setCurrentSession(null);
      setPaymentSuccessData(null);
    } catch (_) {
      setCurrentSession(null);
      setPaymentSuccessData(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('payflow_admin_auth');
    sessionStorage.removeItem('payflow_admin_token');
    setIsAdminLoggedIn(false);
    setShowAdminLogin(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 1: PUBLIC / USER PAYMENT PORTAL
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAdminLoggedIn) {
    if (showAdminLogin) {
      return (
        <div className="app-container">
          <header className="app-header">
            <div className="brand-section">
              <div className="brand-icon"><QrCode size={22} strokeWidth={2.5} /></div>
              <div>
                <div className="brand-title">{config.merchantName || 'MGOCSM Jaipur'}</div>
                <div className="brand-subtitle">Admin Access</div>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShowAdminLogin(false)}
              style={{ fontSize: '0.85rem', padding: '7px 14px' }}
            >
              ← Back to Member Pay
            </button>
          </header>

          <main className="main-content" style={{ justifyContent: 'center' }}>
            <AdminLoginPage
              onSuccess={() => { setIsAdminLoggedIn(true); setShowAdminLogin(false); }}
              onCancel={() => setShowAdminLogin(false)}
            />
          </main>
        </div>
      );
    }

    return (
      <div className="app-container">
        <header className="app-header">
          <div className="brand-section">
            <div className="brand-icon"><QrCode size={22} strokeWidth={2.5} /></div>
            <div>
              <div className="brand-title">{config.merchantName || 'MGOCSM Jaipur'}</div>
              <div className="brand-subtitle">Official UPI Payment Portal</div>
            </div>
          </div>

          <div className="header-actions">
            <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
              <span className="status-dot pulsing" />
              <span>{isConnected ? 'Server Online' : 'Connecting...'}</span>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShowAdminLogin(true)}
              style={{ fontSize: '0.82rem' }}
            >
              <Lock size={13} /> Admin Login
            </button>
          </div>
        </header>

        <main className="main-content" style={{ justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <UserPaymentPortal
              merchantName={config.merchantName}
              merchantUpiId={config.merchantUpiId}
              autoResetSeconds={config.autoResetDelaySeconds}
            />
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 2: AUTHENTICATED ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Toast Notifications */}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon"><QrCode size={22} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-title">{config.merchantName || 'MGOCSM Jaipur'}</div>
            <div className="brand-subtitle" style={{ color: '#34d399', fontWeight: 700 }}>
              <ShieldCheck size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Admin Dashboard
            </div>
          </div>
        </div>

        {/* Center — Tab Group */}
        <div className="nav-tabs-group">
          <button
            className={`nav-tab-btn ${activeAdminTab === 'POS' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('POS')}
            title="POS Counter [1]"
          >
            <Layers size={15} /> POS Counter
          </button>
          <button
            className={`nav-tab-btn ${activeAdminTab === 'LEDGER' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('LEDGER')}
            title="Transactions [2]"
          >
            <History size={15} /> Transactions
            <span className="nav-tab-badge">{stats.todayCount}</span>
          </button>
          <button
            className={`nav-tab-btn ${activeAdminTab === 'PORTAL' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('PORTAL')}
            title="Member Portal Preview [3]"
          >
            <CreditCard size={15} /> Portal Preview
          </button>
        </div>

        {/* Right — Tools & Status */}
        <div className="header-actions">
          {/* Today's revenue */}
          {stats.todayVolume > 0 && (
            <div className="header-revenue">
              <TrendingUp size={13} />
              ₹{stats.todayVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })} today
            </div>
          )}

          {/* Live clock */}
          <LiveClock />

          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
            <span className="status-dot pulsing" />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setIsSimulatorOpen(true)}
            style={{ borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b' }}
            title="Demo Simulator"
          >
            <Sparkles size={15} /> Demo
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsPairingModalOpen(true)}
            title="Pair Android Companion App"
          >
            <Smartphone size={15} /> Pair
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Soundbox Muted [M]' : 'Soundbox Active [M]'}
            style={{ padding: '8px 10px' }}
          >
            {isMuted
              ? <VolumeX size={17} style={{ color: '#f87171' }} />
              : <Volume2 size={17} style={{ color: '#10b981' }} />
            }
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Merchant Settings"
            style={{ padding: '8px 10px' }}
          >
            <SettingsIcon size={17} />
          </button>

          <button
            className="btn-secondary"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen [F]' : 'Fullscreen [F]'}
            style={{ padding: '8px 10px' }}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          <button
            className="btn-secondary btn-danger"
            onClick={handleLogout}
            title="Log out of Admin Dashboard"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        {activeAdminTab === 'POS' ? (
          <>
            <div className="left-panel">
              <CustomerDisplay
                session={currentSession}
                paymentSuccessData={paymentSuccessData}
                merchantName={config.merchantName}
                merchantUpiId={config.merchantUpiId}
                autoResetSeconds={config.autoResetDelaySeconds}
                onReset={handleResetToReady}
              />
            </div>
            <div className="right-panel">
              <MerchantNumpad
                onGenerate={handleGenerateSession}
                onCancel={handleCancelSession}
                isLoading={isLoading}
                hasActiveSession={Boolean(currentSession && currentSession.status === 'WAITING_FOR_PAYMENT')}
              />
            </div>
          </>
        ) : activeAdminTab === 'LEDGER' ? (
          <TransactionLedger
            transactions={transactions}
            stats={stats}
            onRefresh={loadInitialData}
            isLoading={isLoading}
          />
        ) : (
          <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
            <UserPaymentPortal
              merchantName={config.merchantName}
              merchantUpiId={config.merchantUpiId}
              autoResetSeconds={config.autoResetDelaySeconds}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <AndroidPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        deviceToken={config.androidDeviceToken}
      />

      <DemoSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        activeAmount={currentSession?.status === 'WAITING_FOR_PAYMENT' ? currentSession.amount : undefined}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onConfigSaved={(updated) => setConfig(updated)}
      />
    </div>
  );
}

export default App;
