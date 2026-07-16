import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Download } from 'lucide-react';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import type { ReportSalesPoint, CashflowReport, BestSeller, StaffReport } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  const currency = useCurrency();
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>{currency}{payload[0].value.toFixed(2)}</div>
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const showCostTracking = JSON.parse(localStorage.getItem('bms_modules') || '{}').cost_tracking !== false;
  const currency = useCurrency();
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  const { data: salesData = [] } = useQuery<ReportSalesPoint[]>({
    queryKey: ['reports-sales', period],
    queryFn: () => api.get('/reports/sales', { params: { days: period } }).then((r) => r.data),
  });

  const { data: cashflow } = useQuery<CashflowReport>({
    queryKey: ['reports-cashflow'],
    queryFn: () => api.get('/reports/cashflow').then((r) => r.data),
  });

  const { data: bestSellers = [] } = useQuery<BestSeller[]>({
    queryKey: ['reports-best-sellers'],
    queryFn: () => api.get('/reports/best-sellers').then((r) => r.data),
  });

  const { data: staffData = [] } = useQuery<StaffReport[]>({
    queryKey: ['reports-staff'],
    queryFn: () => api.get('/reports/staff').then((r) => r.data),
  });

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0);
  const totalTransactions = salesData.reduce((s, d) => s + d.transactions, 0);
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const maxRevenue = Math.max(...bestSellers.map((b) => b.totalRevenue), 1);

  const handleExportSalesCSV = () => {
    const headers = ['Date', 'Day', 'Transactions Count', `Revenue (${currency})`];
    const rows = salesData.map(d => [
      d.date,
      d.day,
      d.transactions,
      d.revenue.toFixed(2)
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStaffCSV = () => {
    const headers = ['Staff Name', 'Role', 'Transactions Count', `Total Sales (${currency})`];
    const rows = staffData.map(s => [
      s.name,
      s.role,
      s.transactions,
      s.totalSales.toFixed(2)
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Business Reports</div>
          <div className="page-subtitle">Track your performance and growth</div>
        </div>
        <div className="d-flex gap-8">
          <div style={{
            display: 'flex', gap: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 3,
          }}>
            {(['7', '30', '90'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: period === p ? 'var(--accent-blue)' : 'transparent',
                  color: period === p ? 'white' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {p === '7' ? '7D' : p === '30' ? '30D' : '90D'}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={handleExportSalesCSV}><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={showCostTracking ? "grid-4 mb-16" : "grid-3 mb-16"}>
        {[
          { label: 'Total Sales', value: `${currency}${totalRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'blue' },
          ...(showCostTracking ? [{ label: 'Net Profit', value: `${currency}${(cashflow?.netProfit ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'green' }] : []),
          { label: 'Avg Transaction', value: `${currency}${avgTransaction.toFixed(2)}`, icon: ShoppingCart, color: 'purple' },
          { label: 'Outstanding Credit', value: `${currency}${(cashflow?.outstandingCredit ?? 0).toFixed(2)}`, icon: TrendingDown, color: 'red' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-header">
              <div className="stat-label">{s.label}</div>
              <div className={`stat-icon ${s.color}`}><s.icon size={14} /></div>
            </div>
            <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="reports-charts-row" style={{ display: 'grid', gridTemplateColumns: showCostTracking ? '1fr 280px' : '1fr', gap: 16, marginBottom: 16 }}>
        {/* Sales Performance Chart */}
        <div className="card">
          <div className="d-flex justify-between align-center mb-16">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Sales Performance</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily revenue breakdown</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesData.slice(-14)} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency}${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.06)' }} />
              <Bar dataKey="revenue" fill="var(--accent-blue)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Money In & Out */}
        {showCostTracking && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Money In & Out</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 14 }}>
              {currency}{(cashflow?.totalRevenue ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Expenses</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-red)', marginBottom: 14 }}>
              {currency}{(cashflow?.totalCost ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Net Margin</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-green)' }}>
                  {currency}{(cashflow?.netProfit ?? 0).toFixed(2)}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: (cashflow?.grossMargin ?? 0) > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: (cashflow?.grossMargin ?? 0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {(cashflow?.grossMargin ?? 0).toFixed(1)}% Margin
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Best Sellers */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Best Sellers</div>
          {bestSellers.slice(0, 5).map((b) => (
            <div key={b.categoryId} style={{ marginBottom: 12 }}>
              <div className="d-flex justify-between mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{b.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)' }}>{currency}{b.totalRevenue.toFixed(2)}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', width: `${Math.round((b.totalRevenue / maxRevenue) * 100)}%`,
                  background: b.color, borderRadius: 99, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Staff Performance */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Staff Performance</div>
            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleExportStaffCSV}>
              <Download size={11} /> Export
            </button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Transactions</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {staffData.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: 'white',
                        }}>
                          {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="td-name" style={{ fontSize: 12 }}>{s.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 99, fontWeight: 600,
                        background: s.role === 'OWNER' ? 'rgba(124,58,237,0.15)' : 'rgba(79,124,255,0.15)',
                        color: s.role === 'OWNER' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                      }}>{s.role}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.transactions}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{currency}{s.totalSales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
