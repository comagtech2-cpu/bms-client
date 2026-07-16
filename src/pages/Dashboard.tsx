import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, ShoppingCart, CreditCard, AlertTriangle, ArrowUpRight, Package, History, ShoppingBag } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { useCurrency } from '../hooks/useCurrency';
import type {
  DashboardStats, SalesChartPoint, PaymentBreakdown, TopProduct, Transaction,
} from '../types';

/** Returns a live "Updated Xs ago" / "Updated Xm ago" string that ticks every 10s */
function useRelativeTime(updatedAt: number | undefined): string {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!updatedAt) return 'Loading…';
  const diffSec = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (diffSec < 5) return 'Updated just now';
  if (diffSec < 60) return `Updated ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  return `Updated ${diffMin}m ago`;
}

const PIE_COLORS = ['#4f7cff', '#22c55e', '#06b6d4', '#ef4444'];

function StatCard({ label, value, icon: Icon, color, sub, change }: {
  label: string; value: string; icon: any; color: string; sub?: string; change?: string;
}) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-header">
        <div className="stat-label">{label}</div>
        <div className={`stat-icon ${color}`}><Icon size={15} /></div>
      </div>
      <div className="stat-value">{value}</div>
      {change && <div className={`stat-change ${parseFloat(change) >= 0 ? 'up' : 'down'}`}>
        <ArrowUpRight size={11} style={{ display: 'inline' }} /> {change}
      </div>}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const currency = useCurrency();
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>
          {currency}{payload[0].value.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const currency = useCurrency();

  const activeModules = JSON.parse(localStorage.getItem('bms_modules') || '{}');
  const creditEnabled = activeModules.credit !== false;

  const { data: stats, dataUpdatedAt } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const statsUpdatedLabel = useRelativeTime(dataUpdatedAt || undefined);

  const { data: chartData = [] } = useQuery<SalesChartPoint[]>({
    queryKey: ['dashboard-chart'],
    queryFn: () => api.get('/dashboard/sales-chart').then((r) => r.data),
  });

  const { data: paymentData = [] } = useQuery<PaymentBreakdown[]>({
    queryKey: ['dashboard-payment'],
    queryFn: () => api.get('/dashboard/payment-breakdown').then((r) => r.data),
  });

  const { data: topProducts = [] } = useQuery<TopProduct[]>({
    queryKey: ['dashboard-top'],
    queryFn: () => api.get('/dashboard/top-products').then((r) => r.data),
  });

  const { data: recentSales = [] } = useQuery<Transaction[]>({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get('/dashboard/recent-sales').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: productCount } = useQuery<{ total: number }>({
    queryKey: ['dashboard-product-count'],
    queryFn: () => api.get('/products', { params: { limit: 1 } }).then((r) => r.data),
    enabled: !creditEnabled,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalPayments = paymentData.reduce((s, p) => s + p.total, 0);
  const pieData = paymentData.filter((p) => p.total > 0).map((p) => ({
    name: p.method,
    value: totalPayments > 0 ? Math.round((p.total / totalPayments) * 100) : 0,
  }));

  return (
    <div>
      {/* ─── DESKTOP VIEW ─── */}
      <div className="desktop-only">
        {/* Header */}
        <div className="mb-20">
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Executive Overview</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {greeting}, {user?.name?.split(' ')[0]}. Here's what's happening today.
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid-4 mb-20">
          <StatCard
            label="Today's Sales"
            value={`${currency}${(stats?.todaySales ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="blue"
            change={stats?.salesChange}
          />
          <StatCard
            label="Transactions"
            value={String(stats?.todayTransactions ?? 0)}
            icon={ShoppingCart}
            color="green"
            sub={statsUpdatedLabel}
          />
          {creditEnabled ? (
            <StatCard
              label="What Customers Owe"
              value={`${currency}${(stats?.outstandingCredit ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={CreditCard}
              color="red"
              sub="Active credit accounts"
            />
          ) : (
            <StatCard
              label="Total Products"
              value={String(productCount?.total ?? 0)}
              icon={Package}
              color="purple"
              sub="In inventory"
            />
          )}
          <StatCard
            label="Low Stock Items"
            value={String(stats?.lowStockCount ?? 0)}
            icon={AlertTriangle}
            color="orange"
            sub="Needs attention today"
          />
        </div>

        {/* Charts Row */}
        <div className="dashboard-charts-row" style={{ marginBottom: 16 }}>
          {/* Sales Chart */}
          <div className="card">
            <div className="d-flex justify-between align-center mb-16">
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Sales Over Time</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily revenue for the last 7 days</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                Last 7 days
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.06)' }} />
                <Bar dataKey="revenue" fill="var(--accent-blue)" radius={[4, 4, 0, 0]}
                  label={({ x, y, width, value, index }) => index === chartData.length - 1 ? (
                    <text x={x + width / 2} y={y - 5} fill="var(--accent-blue)" fontSize={10} fontWeight={700} textAnchor="middle">
                      {currency}{value.toFixed(0)}
                    </text>
                  ) : <g />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Types */}
          <div className="card">
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>Payment Types</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pieData.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="dashboard-bottom-row">
          {/* Top Selling Items */}
          <div className="card">
            <div className="d-flex justify-between align-center mb-16">
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Top Selling Items</div>
              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>View All</button>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'linear-gradient(135deg, rgba(79,124,255,0.2), rgba(124,58,237,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: 'var(--accent-blue)',
                          }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="td-name" style={{ fontSize: 12 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.qtySold}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                        {currency}{p.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card">
            <div className="d-flex justify-between align-center mb-16">
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Recent Sales</div>
              <span style={{ fontSize: 11, color: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(34,197,94,0.2)' }}>
                Live Feed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSales.map((sale) => (
                <div key={sale.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {(sale.customer?.name ?? 'G')[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sale.customer?.name ?? 'Guest Customer'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {format(new Date(sale.createdAt), 'hh:mm aa')} • {sale.paymentMethod}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currency}{sale.total.toFixed(2)}
                    </div>
                    <span className={`badge badge-${sale.status.toLowerCase()}`}>{sale.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW ─── */}
      <div className="mobile-only">
        {/* Header */}
        <div className="mb-20">
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Business Overview</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'manager'}. Here's what's happening today.
          </div>
        </div>

        {/* Mobile Stats Stacked */}
        <div className="dashboard-mobile-stats mb-20">
          <div className="dash-stat-card blue">
            <div className="dash-stat-info">
              <span className="dash-stat-label">Today's Sales</span>
              <span className="dash-stat-value">
                {currency}{(stats?.todaySales ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="dash-stat-icon-wrapper">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="dash-stat-card green">
            <div className="dash-stat-info">
              <span className="dash-stat-label">Transactions</span>
              <span className="dash-stat-value">{stats?.todayTransactions ?? 0}</span>
            </div>
            <div className="dash-stat-icon-wrapper">
              <ShoppingCart size={20} />
            </div>
          </div>

          <div className="dash-stat-card purple">
            <div className="dash-stat-info">
              <span className="dash-stat-label">Total Products</span>
              <span className="dash-stat-value">{productCount?.total ?? 0}</span>
            </div>
            <div className="dash-stat-icon-wrapper">
              <Package size={20} />
            </div>
          </div>

          <div className="dash-stat-card red">
            <div className="dash-stat-info">
              <span className="dash-stat-label">Low Stock Items</span>
              <span className="dash-stat-value">{stats?.lowStockCount ?? 0}</span>
            </div>
            <div className="dash-stat-icon-wrapper">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        {/* Sales Chart Card */}
        <div className="card mb-20">
          <div className="d-flex justify-between align-center mb-16">
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Sales Over Time</div>
            <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
              Last 7 Days
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={20}>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.06)' }} />
              <Bar dataKey="revenue" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Items Card */}
        <div className="card mb-20">
          <div className="d-flex justify-between align-center mb-16">
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Top Selling Items</div>
            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--accent-blue)' }}>View All</button>
          </div>
          <div className="top-selling-mobile-list">
            {topProducts.slice(0, 3).map((p, idx) => (
              <div key={p.productId} className="top-selling-mobile-item">
                <div className="ts-mobile-img" style={{
                  background: `linear-gradient(135deg, rgba(79,124,255,0.1), rgba(124,58,237,0.1))`,
                  color: 'var(--accent-blue)'
                }}>
                  {p.name.charAt(0)}
                </div>
                <div className="ts-mobile-details">
                  <span className="ts-mobile-name">{p.name}</span>
                  <span className="ts-mobile-sub">{p.qtySold} sales this week</span>
                </div>
                <span className="ts-mobile-percentage">
                  +{idx === 0 ? '12' : idx === 1 ? '8' : '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales Card */}
        <div className="card mb-20">
          <div className="d-flex justify-between align-center mb-16">
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              Recent Sales
            </div>
            <History size={16} color="var(--text-muted)" />
          </div>
          <div className="recent-sales-mobile-list">
            {recentSales.slice(0, 3).map((sale) => (
              <div key={sale.id} className="recent-sales-mobile-item">
                <div className="rs-mobile-icon-circle">
                  <ShoppingBag size={16} />
                </div>
                <div className="rs-mobile-info">
                  <span className="rs-mobile-title">Order #{sale.id.slice(-5).toUpperCase()}</span>
                  <span className="rs-mobile-sub">
                    {format(new Date(sale.createdAt), 'hh:mm aa')} • {sale.paymentMethod}
                  </span>
                </div>
                <span className="rs-mobile-amount">
                  {currency}{sale.total.toLocaleString('en', { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

