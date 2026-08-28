-- SQLite Database Schema for UPI Real-Time Payment Display System

-- Payment Sessions: Active and past customer-facing payment sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    note TEXT,
    order_ref TEXT,
    upi_uri TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('READY', 'WAITING_FOR_PAYMENT', 'PAYMENT_PROCESSING', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'EXPIRED', 'UNKNOWN')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON payment_sessions(created_at);

-- Completed & Audit Transactions Ledger
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    transaction_id TEXT NOT NULL UNIQUE, -- UTR or Gateway Payment ID
    status TEXT NOT NULL CHECK (status IN ('RECEIVED', 'FAILED', 'CANCELLED', 'MISMATCH_REJECTED', 'DUPLICATE_REJECTED')),
    detection_source TEXT NOT NULL CHECK (detection_source IN ('notification', 'gateway', 'demo', 'manual')),
    payer_name TEXT,
    payer_vpa TEXT,
    app_source TEXT,
    bank_name TEXT,
    raw_payload TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES payment_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Key-Value Persistent App Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Device & Listener Health Heartbeats
CREATE TABLE IF NOT EXISTS device_heartbeats (
    device_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    ip_address TEXT,
    battery_level INTEGER,
    last_ping DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'ONLINE'
);
