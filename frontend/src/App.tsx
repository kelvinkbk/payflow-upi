import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck
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

export function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCustomerLink = Boolean(urlParams.get('session') || urlParams.get('amount') || urlParams.get('pay'));
  
  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('payflow_admin_auth') === 'true';
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(() => {
    return urlParams.get('admin') === 'true' && !sessionStorage.getItem('payflow_admin_auth');
  });

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
  const [bannerAlert, setBannerAlert] = useState<{ title: string; message: string; type: 'warning' | 'error' | 'success' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { announcePayment } = useSoundbox();

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const url = new URLSearchParams(window.location.search);
      const querySessionId = url.get('session') || url.get('id');
      const queryAmount = url.get('amount') || url.get('amt') || url.get('pay');
      const queryNote = url.get('note') || url.get('desc');

      // Case 1: Existing session by ID
      if (querySessionId) {
        const [cfgRes, sessionRes] = await Promise.all([
          api.getConfig(),
          api.getSession(querySessionId).catch(() => ({ success: false, data: null }))
        ]);
        if (cfgRes.success) setConfig(cfgRes.data);
        if (sessionRes.success && sessionRes.data) setCurrentSession(sessionRes.data);
        return;
      }

      // Case 2: Dynamic on-the-fly custom amount link (e.g. ?amount=250&note=Camp+Registration)
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

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-Time Background Sync Loop (ensures mobile Safari stays 100% in sync)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        // Sync 1: If in Admin mode, refresh transaction ledger every 3.5s
        if (isAdminLoggedIn) {
          const txRes = await api.getTransactions({ limit: 50 });
          if (txRes.success) {
            setTransactions(txRes.data);
            setStats(txRes.stats);
          }
        }

        // Sync 2: If active POS session is waiting for payment, check status
        if (currentSession && currentSession.status === 'WAITING_FOR_PAYMENT') {
          const sRes = await api.getSession(currentSession.id).catch(() => api.getCurrentSession());
          if (sRes.success && sRes.data) {
            if (sRes.data.status === 'PAYMENT_RECEIVED') {
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
        }
      } catch (err) {
        // silent retry
      }
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [isAdminLoggedIn, currentSession]);

  // Handle successful payment received event
  const handlePaymentReceived = useCallback((data: PaymentReceivedPayload) => {
    setPaymentSuccessData(data);
    setCurrentSession((prev) => prev ? { ...prev, status: 'PAYMENT_RECEIVED' } : null);

    // Trigger Voice Soundbox Announcement if enabled
    if (config.soundboxVoiceEnabled && !isMuted) {
      announcePayment(data.amount, data.appSource || 'UPI', config.soundboxLanguage);
    }

    // Refresh transaction list and stats
    api.getTransactions({ limit: 50 }).then((res) => {
      if (res.success) {
        setTransactions(res.data);
        setStats(res.stats);
      }
    }).catch(console.error);
  }, [config.soundboxVoiceEnabled, config.soundboxLanguage, isMuted, announcePayment]);

  // Handle unsolicited spontaneous payments
  const handleUnsolicitedPayment = useCallback((data: PaymentReceivedPayload) => {
    setBannerAlert({
      title: 'Payment Received Outside Session',
      message: `₹${data.amount.toFixed(2)} received from ${data.payerName || 'UPI Customer'} (Ref: ${data.transactionId})`,
      type: 'warning'
    });

    if (config.soundboxVoiceEnabled && !isMuted) {
      announcePayment(data.amount, data.appSource || 'UPI', config.soundboxLanguage);
    }

    api.getTransactions({ limit: 50 }).then((res) => {
      if (res.success) {
        setTransactions(res.data);
        setStats(res.stats);
      }
    }).catch(console.error);
  }, [config.soundboxVoiceEnabled, config.soundboxLanguage, isMuted, announcePayment]);

  // Handle session created from other controller/display
  const handleSessionCreated = useCallback((session: PaymentSession) => {
    setCurrentSession(session);
    setPaymentSuccessData(null);
  }, []);

  // Handle session cancelled/reset
  const handleSessionStateChange = useCallback((session: PaymentSession | null) => {
    setCurrentSession(session);
    if (!session) {
      setPaymentSuccessData(null);
    }
  }, []);

  // Setup WebSocket real-time listener
  const { isConnected } = useWebSocket({
    onPaymentReceived: handlePaymentReceived,
    onSessionCreated: handleSessionCreated,
    onSessionCancelled: () => handleSessionStateChange(null),
    onAmountMismatch: handleUnsolicitedPayment
  });

  // Cashier POS Actions
  const handleGenerateSession = async (amount: number, note?: string) => {
    setIsLoading(true);
    try {
      const res = await api.createSession(amount, note);
      if (res.success) {
        setCurrentSession(res.data);
        setPaymentSuccessData(null);
      }
    } catch (err: any) {
      setBannerAlert({
        title: 'Error Generating QR',
        type: 'error',
        message: err.message || 'Could not generate UPI QR code.'
      });
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
    } catch (err) {
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

  // ==========================================
  // VIEW 1: PUBLIC / USER PAYMENT PORTAL
  // ==========================================
  if (!isAdminLoggedIn) {
    if (showAdminLogin) {
      return (
        <div className="app-container">
          <header className="app-header">
            <div className="brand-section">
              <div className="brand-icon">
                <QrCode size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div className="brand-title">{config.merchantName || 'MGOCSM Jaipur'}</div>
                <div className="brand-subtitle">Admin Access</div>
              </div>
            </div>
            <div>
              <button
                className="btn-secondary"
                onClick={() => setShowAdminLogin(false)}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              >
                ← Back to Member Pay
              </button>
            </div>
          </header>

          <main className="main-content" style={{ justifyContent: 'center' }}>
            <AdminLoginPage
              onSuccess={() => {
                setIsAdminLoggedIn(true);
                setShowAdminLogin(false);
              }}
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
            <div className="brand-icon">
              <QrCode size={24} strokeWidth={2.5} />
            </div>
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
              style={{ fontSize: '0.82rem', padding: '6px 12px', borderColor: 'rgba(255, 255, 255, 0.15)' }}
            >
              <Lock size={14} /> Admin Login
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

  // ==========================================
  // VIEW 2: AUTHENTICATED ADMIN DASHBOARD
  // ==========================================
  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Top Navbar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <QrCode size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-title">{config.merchantName || 'MGOCSM Jaipur'}</div>
            <div className="brand-subtitle" style={{ color: '#34d399', fontWeight: 700 }}>Admin Dashboard</div>
          </div>
        </div>

        {/* Center Tabs */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={`nav-tab-btn ${activeAdminTab === 'POS' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('POS')}
          >
            <Layers size={16} /> POS Counter
          </button>
          <button 
            className={`nav-tab-btn ${activeAdminTab === 'LEDGER' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('LEDGER')}
          >
            <History size={16} /> Transactions ({stats.todayCount})
          </button>
          <button 
            className={`nav-tab-btn ${activeAdminTab === 'PORTAL' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('PORTAL')}
          >
            <CreditCard size={16} /> Member Portal Preview
          </button>
        </div>

        {/* Right Tools & Status */}
        <div className="header-actions">
          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
            <span className="status-dot pulsing" />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setIsSimulatorOpen(true)}
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <Sparkles size={16} /> Demo Simulator
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsPairingModalOpen(true)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            title="Pair Android Companion App"
          >
            <Smartphone size={16} /> Pair Phone
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Soundbox Muted' : 'Soundbox Active'}
            style={{ padding: '8px' }}
          >
            {isMuted ? <VolumeX size={18} style={{ color: '#f87171' }} /> : <Volume2 size={18} style={{ color: '#10b981' }} />}
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Merchant Settings"
            style={{ padding: '8px' }}
          >
            <SettingsIcon size={18} />
          </button>

          <button
            className="btn-secondary"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Counter Display'}
            style={{ padding: '8px' }}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            className="btn-secondary"
            onClick={handleLogout}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '6px 12px', fontSize: '0.85rem' }}
            title="Log out of Admin Dashboard"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Floating Warning/Error Alert Banner */}
      {bannerAlert && (
        <div style={{
          background: bannerAlert.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'fade-in 0.3s ease',
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} />
            <div>
              <strong>{bannerAlert.title}</strong> — {bannerAlert.message}
            </div>
          </div>
          <button 
            onClick={() => setBannerAlert(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="main-content">
        {activeAdminTab === 'POS' ? (
          <>
            {/* Left: Customer Facing Display Screen */}
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

            {/* Right: Cashier / Merchant Numpad Controller */}
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

      {/* Modals & Dialogs */}
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
