import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import type { Transaction, TransactionListResponse } from '../types';

function downloadReceiptHtml(tx: Transaction, business: any, currency: string, subtotal: number, tax: number, vatRate: number) {
  const staffName = tx.staff?.name ?? 'Staff';
  const customerName = tx.customer?.name ?? tx.guestName ?? 'Guest Customer';
  const itemsHtml = tx.items?.map((item) => `
    <tr>
      <td style="padding: 6px 0; text-align: left; font-weight: 700; word-break: break-word;">${item.product?.name ?? ''}</td>
      <td style="padding: 6px 0; text-align: center; font-weight: 600;">${item.qty}</td>
      <td style="padding: 6px 0; text-align: right;">${currency}${item.price.toFixed(2)}</td>
      <td style="padding: 6px 0; text-align: right; font-weight: 800;">${currency}${(item.qty * item.price).toFixed(2)}</td>
    </tr>
  `).join('') ?? '';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt #${String(tx.id).padStart(5, "0")}</title>
<style>
  @page { size: auto; margin: 0.4in; }
  body {
    margin: 0;
    padding: 20px;
    background: #ffffff;
    color: #000000;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    justify-content: center;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .receipt {
    width: 100%;
    max-width: 360px;
    border: 2px solid #000000;
    padding: 20px 16px;
    box-sizing: border-box;
    background: #ffffff;
    color: #000000;
  }
  .header {
    text-align: center;
    border-bottom: 2px dashed #000000;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .title {
    font-size: 20px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 4px;
    color: #000000;
  }
  .subtitle {
    font-size: 13px;
    color: #374151;
    font-weight: 600;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    border-bottom: 2px dashed #000000;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .label {
    font-size: 11px;
    font-weight: 700;
    color: #4b5563;
    text-transform: uppercase;
  }
  .value {
    font-size: 13px;
    font-weight: 700;
    color: #000000;
  }
  .badge {
    background: #000000;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    display: inline-block;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    table-layout: fixed;
  }
  th {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    padding-bottom: 8px;
    border-bottom: 1.5px solid #000000;
    color: #000000;
  }
  td {
    color: #000000;
  }
  .totals {
    border-top: 1.5px solid #000000;
    border-bottom: 2px dashed #000000;
    padding: 12px 0;
    margin-bottom: 16px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #374151;
  }
  .row.grand {
    font-size: 16px;
    font-weight: 800;
    margin: 8px 0;
    padding: 6px 0;
    border-top: 1px dashed #000000;
    border-bottom: 1px dashed #000000;
    color: #000000;
  }
  .footer {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #4b5563;
  }
  @media print {
    body { padding: 0; }
    .receipt { border: 1.5px solid #000000; width: 100%; max-width: 100%; margin: 0 auto; }
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="title">${business?.name ?? "My Business"}</div>
    ${business?.address ? `<div class="subtitle">${business.address}</div>` : ""}
    ${business?.phone ? `<div class="subtitle">${business.phone}</div>` : ""}
  </div>
  <div class="meta-grid">
    <div>
      <div class="label">Receipt #</div>
      <div class="value">${String(tx.id).padStart(5, "0")}</div>
    </div>
    <div style="text-align: right;">
      <div class="label">Status</div>
      <div><span class="badge">PAID</span></div>
    </div>
    <div style="margin-top: 6px;">
      <div class="label">Date & Time</div>
      <div class="value">${format(new Date(tx.createdAt), "MMM d, yyyy, h:mm a")}</div>
    </div>
    <div style="text-align: right; margin-top: 6px;">
      <div class="label">Served By</div>
      <div class="value">${staffName}</div>
    </div>
  </div>
  ${(tx.customer || tx.guestName) ? `<div style="font-size: 12px; margin-bottom: 12px; border-bottom: 1px dashed #000000; padding-bottom: 8px; color: #374151;">CUSTOMER: <strong style="color: #000000; font-weight: 800;">${customerName}</strong></div>` : ""}
  <table>
    <thead>
      <tr>
        <th style="text-align: left; width: 42%;">Item</th>
        <th style="text-align: center; width: 16%;">Qty</th>
        <th style="text-align: right; width: 21%;">Price</th>
        <th style="text-align: right; width: 21%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${currency}${subtotal.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Tax (VAT ${vatRate}%)</span><span>${currency}${tax.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="row grand"><span>GRAND TOTAL</span><span style="font-size: 18px; font-weight: 900; color: #000000;">${currency}${tx.total.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Amount Paid (${tx.paymentMethod})</span><span>${currency}${tx.amountPaid.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="row"><span>Balance Due</span><span>${currency}${(tx.change > 0 ? 0 : Math.max(0, tx.total - tx.amountPaid)).toFixed(2)}</span></div>
    ${tx.change > 0 ? `<div class="row" style="color: #000000; font-weight: 700; margin-top: 4px;"><span>Change Given</span><span>${currency}${tx.change.toFixed(2)}</span></div>` : ""}
  </div>
  <div class="footer">THANK YOU FOR YOUR BUSINESS!</div>
</div>
<script>
  window.onload = function() { window.print(); };
</script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt_${String(tx.id).padStart(5, "0")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
        <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
        <div className="data-table-wrap" style={{ marginBottom: 12 }}>
          <table className="data-table">
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
        </div>
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
        <div className="modal-footer no-print">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-secondary" onClick={() => downloadReceiptHtml(tx, business, currency, subtotal, tax, vatRate)}>
            <Download size={14} /> Download Receipt
          </button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</button>
        </div>
      </div>

      {/* Print only receipt container */}
      <div className="receipt-container print-only">
        {/* Header */}
        <div className="receipt-header">
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
            <span className="receipt-meta-badge">PAID</span>
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
          <div style={{ fontSize: 12, marginBottom: 12, color: '#374151', borderBottom: '1px dashed #000000', paddingBottom: 8 }}>
            CUSTOMER: <strong style={{ color: '#000000', fontWeight: 800 }}>{tx.customer?.name ?? tx.guestName}</strong>
          </div>
        )}

        {/* Items Table */}
        <table className="receipt-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '42%' }}>Item</th>
              <th style={{ textAlign: 'center', width: '16%' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '21%' }}>Price</th>
              <th style={{ textAlign: 'right', width: '21%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tx.items?.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'left', fontWeight: 700, color: '#000000' }}>{item.product?.name}</td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#000000' }}>{item.qty}</td>
                <td style={{ textAlign: 'right', color: '#374151' }}>{currency}{item.price.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#000000' }}>{currency}{(item.qty * item.price).toFixed(2)}</td>
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
            <span style={{ fontWeight: 800, color: '#000000' }}>GRAND TOTAL</span>
            <span className="receipt-total-row grand-amount" style={{ color: '#000000' }}>
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
            <div className="receipt-total-row" style={{ color: '#000000', fontWeight: 700, marginTop: 4 }}>
              <span>Change Given</span>
              <span>{currency}{tx.change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#4b5563' }}>
          THANK YOU FOR YOUR BUSINESS!
        </div>

        <div className="receipt-digital-card">
          <QRCodeSVG value={`Receipt #${String(tx.id).padStart(5, '0')} | ${business?.name ?? ''} | ${currency}${tx.total.toFixed(2)}`} size={56} className="receipt-digital-qr" />
          <div className="receipt-digital-info">
            <span className="receipt-digital-title" style={{ color: '#000000' }}>Digital Copy</span>
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
