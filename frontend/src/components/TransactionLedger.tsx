import React, { useState } from 'react';
import { Download, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Copy, Check, TrendingUp, Calendar } from 'lucide-react';
import { Transaction, TransactionStats } from '../types';
import { api } from '../services/api';

interface TransactionLedgerProps {
  transactions: Transaction[];
  stats: TransactionStats;
  onRefresh: () => void;
  isLoading: boolean;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions, stats, onRefresh, isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      !searchTerm ||
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payer_name && tx.payer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.app_source && tx.app_source.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayRevenue = stats.todayVolume;
  const allRevenue   = stats.totalVolume;

  const copyUTR = (utr: string) => {
    navigator.clipboard.writeText(utr).then(() => {
      setCopiedId(utr);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge-received"><CheckCircle2 size={11} /> Received</span>;
      case 'MISMATCH_REJECTED':
        return <span className="badge-rejected"><AlertTriangle size={11} /> Mismatch</span>;
      case 'DUPLICATE_REJECTED':
        return <span className="badge-rejected"><XCircle size={11} /> Duplicate</span>;
      default:
        return <span className="badge-rejected">{status}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ width: '100%' }}>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Today's Volume</div>
          <div className="stat-val" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ₹{stats.todayVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-change">
            <TrendingUp size={11} style={{ display: 'inline', marginRight: 3 }} />
            {stats.todayCount} transactions today
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Today's Count</div>
          <div className="stat-val">{stats.todayCount}</div>
          <div className="stat-change">
            <Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />
            transactions
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">All-Time Volume</div>
          <div className="stat-val" style={{ background: 'linear-gradient(135deg,#38bdf8,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ₹{stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-change">across all time</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-val">{stats.totalCount}</div>
          <div className="stat-change">cumulative count</div>
        </div>
      </div>

      {/* Filter & Export Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '240px' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search UTR, Payer, App..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.875rem' }}
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '155px', fontSize: '0.875rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="MISMATCH_REJECTED">Mismatched</option>
            <option value="DUPLICATE_REJECTED">Duplicate</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Ledger"
            style={{ padding: '9px 12px' }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin-anim' : ''} />
          </button>
          <a
            href={api.getExportCsvUrl()}
            download
            className="btn-secondary"
            style={{ textDecoration: 'none', padding: '9px 14px', borderColor: 'rgba(16,185,129,0.35)', color: '#34d399' }}
          >
            <Download size={15} /> Export CSV
          </a>
        </div>
      </div>

      {/* Result count */}
      {searchTerm || statusFilter !== 'ALL' ? (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Showing {filtered.length} of {transactions.length} transactions
          {filtered.length !== transactions.length && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', marginLeft: '8px', fontFamily: 'var(--font-main)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : null}

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
                <td colSpan={7}>
                  <div className="empty-state">
                    <div style={{ fontSize: '2.5rem' }}>📋</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      {searchTerm || statusFilter !== 'ALL' ? 'No matching transactions' : 'No transactions yet'}
                    </div>
                    <div style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '260px' }}>
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'Try adjusting your search or filter.'
                        : 'Completed payments will appear here in real time.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id}>
                  {/* Time */}
                  <td>
                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '1px' }}>
                      {relativeTime(tx.created_at)}
                    </div>
                  </td>

                  {/* Amount */}
                  <td style={{ fontWeight: 800, color: tx.status === 'RECEIVED' ? '#10b981' : '#f87171', fontSize: '0.95rem', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td>{getStatusBadge(tx.status)}</td>

                  {/* UTR with copy */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#e2e8f0', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {tx.transaction_id}
                      </span>
                      <button
                        className="row-action-btn"
                        onClick={() => copyUTR(tx.transaction_id)}
                        title="Copy UTR"
                      >
                        {copiedId === tx.transaction_id
                          ? <Check size={11} style={{ color: '#34d399' }} />
                          : <Copy size={11} />
                        }
                      </button>
                    </div>
                  </td>

                  {/* Payer */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {tx.payer_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {tx.payer_vpa && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {tx.payer_vpa}
                      </div>
                    )}
                  </td>

                  {/* App/Bank */}
                  <td>
                    <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>
                      {tx.app_source || 'UPI'}
                    </span>
                    {tx.bank_name && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '1px' }}>
                        {tx.bank_name}
                      </div>
                    )}
                  </td>

                  {/* Detection source */}
                  <td>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
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
