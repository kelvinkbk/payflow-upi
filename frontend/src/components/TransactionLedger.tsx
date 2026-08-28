import React, { useState } from 'react';
import { Download, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Transaction, TransactionStats } from '../types';
import { api } from '../services/api';

interface TransactionLedgerProps {
  transactions: Transaction[];
  stats: TransactionStats;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  stats,
  onRefresh,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = transactions.filter((tx) => {
    const matchesSearch = 
      !searchTerm ||
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payer_name && tx.payer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.app_source && tx.app_source.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="badge-received" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Received
          </span>
        );
      case 'MISMATCH_REJECTED':
        return (
          <span className="badge-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Amount Mismatch
          </span>
        );
      case 'DUPLICATE_REJECTED':
        return (
          <span className="badge-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> Duplicate
          </span>
        );
      default:
        return <span className="status-pill offline">{status}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ width: '100%' }}>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Today's Volume</div>
          <div className="stat-val" style={{ color: '#10b981' }}>₹{stats.todayVolume.toFixed(2)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Today's Count</div>
          <div className="stat-val">{stats.todayCount} txns</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">All-Time Volume</div>
          <div className="stat-val" style={{ color: '#38bdf8' }}>₹{stats.totalVolume.toFixed(2)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-val">{stats.totalCount}</div>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by UTR, Payer or App..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '160px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="MISMATCH_REJECTED">Mismatched</option>
            <option value="DUPLICATE_REJECTED">Duplicate</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={onRefresh} disabled={isLoading} title="Refresh Ledger">
            <RefreshCw size={16} className={isLoading ? 'spin-anim' : ''} />
          </button>
          <a href={api.getExportCsvUrl()} download className="btn-secondary" style={{ textDecoration: 'none' }}>
            <Download size={16} /> Export CSV
          </a>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="ledger-table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Transaction ID / UTR</th>
              <th>Payer</th>
              <th>App / Bank</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No transactions found. Completed payments will appear here in real time.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ fontWeight: 800, color: tx.status === 'RECEIVED' ? '#10b981' : '#f87171', fontSize: '1rem' }}>
                    ₹{tx.amount.toFixed(2)}
                  </td>
                  <td>{getStatusBadge(tx.status)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e2e8f0' }}>
                    {tx.transaction_id}
                  </td>
                  <td>{tx.payer_name || '—'}</td>
                  <td>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{tx.app_source || 'UPI'}</span>
                    {tx.bank_name && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '4px' }}>({tx.bank_name})</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {tx.detection_source}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
