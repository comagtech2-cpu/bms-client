import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import type { Transaction, TransactionListResponse } from '../types';

function TransactionDetail({ tx, business, onClose }: { tx: Transaction; business: any; onClose: () => void }) {
  const currency = business?.currency || '$';
  const vatRate = business?.vatRate !== undefined ? business.vatRate : 7.5;
  const subtotal = tx.total / (1 + vatRate / 100);
  const tax = tx.total - subtotal;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box wide no-print">
        <div className="modal-header">
          <h2 className="modal-title">Transaction #{String(tx.id).padStart(5, '0')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Date', value: format(new Date(tx.createdAt), 'MMM d, yyyy hh:mm aa') },
            { label: 'Customer', value: tx.customer?.name ?? tx.guestName ?? 'Guest Customer' },
            { label: 'Staff', value: tx.staff?.name ?? '—' },
            { label: 'Payment Method', value: tx.paymentMethod },
            { label: 'Status', value: tx.status },
            { label: 'Amount Paid', value: `${currency}${tx.amountPaid.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
        <table className="data-table" style={{ marginBottom: 12 }}>
          <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {tx.items?.map((item) => (
              <tr key={item.id}>
                <td className="td-name">{item.product?.name}</td>
                <td>{item.qty}</td>
                <td>{currency}{item.price.toFixed(2)}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{currency}{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Total</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-blue)' }}>{currency}{tx.total.toFixed(2)}</div>
        </div>
        {tx.change > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Change Given</span>
            <span style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 700 }}>{currency}{tx.change.toFixed(2)}</span>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={14} /> Print Receipt</button>
        </div>
      </div>

      {/* Print only receipt container */}
      <div className="receipt-container print-only">
        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-icon-wrapper">
            <Receipt size={32} />
          </div>
          <div className="receipt-title">{business?.name ?? 'My Business'}</div>
          {business?.address && <div className="receipt-subtitle">{business.address}</div>}
          {business?.phone && <div className="receipt-subtitle">{business.phone}</div>}
        </div>

        {/* Meta Grid */}
        <div className="receipt-meta-grid">
          <div className="receipt-meta-item">
            <span className="receipt-meta-label">Receipt #</span>
            <span className="receipt-meta-value">{String(tx.id).padStart(5, '0')}</span>
          </div>
          <div className="receipt-meta-item right">
            <span className="receipt-meta-label">Status</span>
            <span className="receipt-meta-value" style={{ color: 'var(--accent-green)', fontWeight: 800 }}>PAID</span>
          </div>
          <div className="receipt-meta-item">
            <span className="receipt-meta-label">Date & Time</span>
            <span className="receipt-meta-value">{format(new Date(tx.createdAt), 'MMM d, yyyy, h:mm a')}</span>
          </div>
          <div className="receipt-meta-item right">
            <span className="receipt-meta-label">Served By</span>
            <span className="receipt-meta-value">{tx.staff?.name ?? 'Staff'}</span>
          </div>
        </div>

        {/* Customer info if present */}
        {(tx.customer || tx.guestName) && (
          <div style={{ fontSize: 11, marginBottom: 12, color: 'var(--text-muted)' }}>
            CUSTOMER: <strong style={{ color: 'var(--text-primary)' }}>{tx.customer?.name ?? tx.guestName}</strong>
          </div>
        )}

        {/* Items Table */}
        <table className="receipt-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tx.items?.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.product?.name}</td>
                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{currency}{item.price.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{currency}{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Panel */}
        <div className="receipt-totals-panel">
          <div className="receipt-total-row">
            <span>Subtotal</span>
            <span>{currency}{subtotal.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="receipt-total-row">
            <span>Tax (VAT {vatRate}%)</span>
            <span>{currency}{tax.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="receipt-total-row grand">
            <span style={{ fontWeight: 700 }}>GRAND TOTAL</span>
            <span className="receipt-total-row grand-amount">
              {currency}{tx.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="receipt-total-row" style={{ marginTop: 4 }}>
            <span>Amount Paid ({tx.paymentMethod})</span>
            <span>{currency}{tx.amountPaid.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="receipt-total-row">
            <span>Balance Due</span>
            <span>{currency}{(tx.change > 0 ? 0 : Math.max(0, tx.total - tx.amountPaid)).toFixed(2)}</span>
          </div>
          {tx.change > 0 && (
            <div className="receipt-total-row" style={{ color: 'var(--accent-green)', fontWeight: 600, marginTop: 2 }}>
              <span>Change Given</span>
              <span>{currency}{tx.change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1.5px dashed var(--border)', margin: '16px 0' }} />

        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          THANK YOU FOR YOUR BUSINESS!
        </div>

        <div className="receipt-digital-card">
          <QRCodeSVG value={`Receipt #${String(tx.id).padStart(5, '0')} | ${business?.name ?? ''} | ${currency}${tx.total.toFixed(2)}`} size={56} className="receipt-digital-qr" />
          <div className="receipt-digital-info">
            <span className="receipt-digital-title">Digital Copy</span>
            <span className="receipt-digital-desc">Scan this code to download or share your digital receipt.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const currency = useCurrency();
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  const { data, isLoading } = useQuery<TransactionListResponse>({
    queryKey: ['transactions', page, method, status],
    queryFn: () => api.get('/transactions', { params: { page, limit: 15, method: method || undefined, status: status || undefined } }).then((r) => r.data),
  });

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: () => api.get('/settings/business').then((r) => r.data),
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Customer', 'Items Count', 'Payment Method', `Total (${currency})`, 'Status'];
    const rows = transactions.map(tx => [
      String(tx.id).padStart(5, '0'),
      format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm'),
      tx.customer?.name ?? tx.guestName ?? 'Guest',
      tx.items?.length ?? 0,
      tx.paymentMethod,
      tx.total.toFixed(2),
      tx.status
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Transaction History</div>
          <div className="page-subtitle">Complete record of all sales and payments</div>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV}>
          <Download size={14} style={{ marginRight: 4 }} /> Export History
        </button>
      </div>

      {/* Filters */}
      <div className="d-flex gap-8 mb-16">
        <select className="form-control" style={{ width: 150 }} value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="TRANSFER">Transfer</option>
          <option value="CREDIT">Credit</option>
        </select>
        <select className="form-control" style={{ width: 140 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="CREDIT">Credit</option>
          <option value="PARTIAL">Partial</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {total} total transactions
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="loading-state"><div className="loading-spinner" /></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <Receipt size={40} className="empty-icon" />
            <div className="empty-title">No transactions found</div>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Method</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 12 }}>
                      #{String(tx.id).padStart(5, '0')}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {format(new Date(tx.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>{format(new Date(tx.createdAt), 'hh:mm aa')}</div>
                    </td>
                    <td className="td-name">{tx.customer?.name ?? tx.guestName ?? 'Guest'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.items?.length ?? 0} items</td>
                    <td>
                      <span className={`badge badge-${tx.paymentMethod.toLowerCase()}`}>{tx.paymentMethod}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{tx.total.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => setSelected(tx)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

      {selected && <TransactionDetail tx={selected} business={business} onClose={() => setSelected(null)} />}
    </div>
  );
}
