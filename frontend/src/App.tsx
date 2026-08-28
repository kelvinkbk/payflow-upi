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
  CheckCircle2,
  Layers
} from 'lucide-react';
import { CustomerDisplay } from './components/CustomerDisplay';
import { MerchantNumpad } from './components/MerchantNumpad';
import { TransactionLedger } from './components/TransactionLedger';
import { UserPaymentPortal } from './components/UserPaymentPortal';
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
  const initialTab = urlParams.get('admin') === 'true' ? 'POS' : 'MEMBER_PAY';

  const [activeTab, setActiveTab] = useState<'MEMBER_PAY' | 'POS' | 'LEDGER'>(initialTab);
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

  const urlParams = new URLSearchParams(window.location.search);
  const isCustomerLink = Boolean(urlParams.get('session') || urlParams.get('amount') || urlParams.get('pay'));

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
    });
  }, [config.soundboxVoiceEnabled, config.soundboxLanguage, isMuted, announcePayment]);

  // Handle Amount Mismatch
  const handleAmountMismatch = useCallback((data: any) => {
    setBannerAlert({
      type: 'warning',
      title: 'Payment Amount Mismatch Detected!',
      message: `Received ₹${data.receivedAmount.toFixed(2)} from ${data.appSource || 'UPI'}, but expected ₹${data.expectedAmount.toFixed(2)} [UTR: ${data.transactionId}]. Payment was NOT confirmed.`
    });
    setTimeout(() => setBannerAlert(null), 8000);
  }, []);

  // Handle Duplicate Payment Warning
  const handleDuplicateWarning = useCallback((data: any) => {
    setBannerAlert({
      type: 'warning',
      title: 'Duplicate Transaction Ignored',
      message: `Transaction ${data.transactionId} was already processed previously. Ignored duplicate notification.`
    });
    setTimeout(() => setBannerAlert(null), 7000);
  }, []);

  // WebSocket real-time connection
  const { isConnected } = useWebSocket({
    onPaymentReceived: handlePaymentReceived,
    onSessionCreated: (data) => {
      setCurrentSession(data.session);
      setPaymentSuccessData(null);
    },
    onSessionCancelled: () => {
      setCurrentSession(null);
      setPaymentSuccessData(null);
    },
    onAmountMismatch: handleAmountMismatch,
    onDuplicateWarning: handleDuplicateWarning
  });

  // Handle manual session generation from Numpad
  const handleGenerateSession = async (amount: number, note?: string) => {
    setIsLoading(true);
    setBannerAlert(null);
    try {
      const res = await api.createSession(amount, note);
      if (res.success) {
        setCurrentSession(res.data);
        setPaymentSuccessData(null);
      }
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        title: 'QR Generation Failed',
        message: err.message || 'Could not generate UPI QR code.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Session Cancellation
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

  // Handle Return to Ready state
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

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
            <div className="brand-subtitle">PayFlow UPI Terminal</div>
          </div>
        </div>

        {/* Center Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`nav-tab-btn ${activeTab === 'MEMBER_PAY' ? 'active' : ''}`}
            onClick={() => setActiveTab('MEMBER_PAY')}
          >
            <CreditCard size={16} /> Pay via UPI
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'POS' ? 'active' : ''}`}
            onClick={() => setActiveTab('POS')}
          >
            <Layers size={16} /> POS Counter
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'LEDGER' ? 'active' : ''}`}
            onClick={() => setActiveTab('LEDGER')}
          >
            <History size={16} /> Admin Ledger ({stats.todayCount})
          </button>
        </div>

        {/* Right Tools & Status */}
        <div className="header-actions">
          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
            <span className="status-dot pulsing" />
            <span>{isConnected ? 'Server Live' : 'Reconnecting...'}</span>
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
      <main className="main-content" style={{ justifyContent: activeTab === 'MEMBER_PAY' || isCustomerLink ? 'center' : undefined }}>
        {activeTab === 'MEMBER_PAY' ? (
          <div style={{ width: '100%', maxWidth: '520px', animation: 'fade-in 0.3s ease' }}>
            <UserPaymentPortal
              merchantName={config.merchantName}
              merchantUpiId={config.merchantUpiId}
              autoResetSeconds={config.autoResetDelaySeconds}
            />
          </div>
        ) : activeTab === 'POS' ? (
          <>
            {/* Left: Customer Facing Display Screen */}
            <div className="left-panel" style={{ maxWidth: isCustomerLink ? '540px' : undefined, width: '100%' }}>
              <CustomerDisplay
                session={currentSession}
                paymentSuccessData={paymentSuccessData}
                merchantName={config.merchantName}
                merchantUpiId={config.merchantUpiId}
                autoResetSeconds={config.autoResetDelaySeconds}
                onReset={handleResetToReady}
              />
            </div>

            {/* Right: Cashier / Merchant Numpad Controller (Hidden for remote customer links) */}
            {!isCustomerLink && (
              <div className="right-panel">
                <MerchantNumpad
                  onGenerate={handleGenerateSession}
                  onCancel={handleCancelSession}
                  isLoading={isLoading}
                  hasActiveSession={Boolean(currentSession && currentSession.status === 'WAITING_FOR_PAYMENT')}
                />
              </div>
            )}
          </>
        ) : (
          <TransactionLedger
            transactions={transactions}
            stats={stats}
            onRefresh={loadInitialData}
            isLoading={isLoading}
          />
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
        activeAmount={currentSession?.amount}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onConfigSaved={(newCfg) => setConfig(newCfg)}
      />
    </div>
  );
}

export default App;
