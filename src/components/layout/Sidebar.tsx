import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Warehouse,
  Users, CreditCard, Receipt, BarChart2, Settings, LogOut,
  AlertTriangle, Store,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { Product, BusinessProfile } from '../../types';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/sales', icon: ShoppingCart, label: 'Sales', module: 'pos' },
  { to: '/products', icon: Package, label: 'Products', module: 'inventory' },
  { to: '/categories', icon: Tag, label: 'Categories', module: 'inventory' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory', module: 'inventory' },
  { to: '/customers', icon: Users, label: 'Customers', module: 'customers' },
  { to: '/credit', icon: CreditCard, label: 'Credit', module: 'credit' },
  { to: '/transactions', icon: Receipt, label: 'Transactions', module: 'pos' },
  { to: '/reports', icon: BarChart2, label: 'Reports', module: 'reports' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Load modules from local storage
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('bms_modules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      pos: true,
      inventory: true,
      customers: true,
      credit: true,
      reports: true,
      staff: false,
      cost_tracking: true,
    };
  });

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('bms_modules');
      if (saved) {
        try {
          setActiveModules(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage-modules-updated', handleUpdate);
    return () => window.removeEventListener('storage-modules-updated', handleUpdate);
  }, []);

  const { data: lowStock = [] } = useQuery<Product[]>({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/products/low-stock').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: business } = useQuery<BusinessProfile>({
    queryKey: ['business'],
    queryFn: () => api.get('/settings/business').then((r) => r.data),
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter((item) => {
    if (!item.module) return true;
    if (item.module === 'reports' && user?.role !== 'OWNER') return false;
    return activeModules[item.module] !== false;
  });

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <img
          src={business?.logo || "/mylogo.png"}
          alt="Logo"
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
        />
        <div>
          <div className="brand-name">{business?.name ?? user?.name ?? 'My Business'}</div>
          <div className="brand-tagline">{business?.tagline || ''}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="sidebar-low-stock">
          <div className="low-stock-title">
            <AlertTriangle size={12} />
            Low Stock Alerts
          </div>
          {lowStock.slice(0, 3).map((p) => (
            <div key={p.id} className="low-stock-item" onClick={() => { navigate('/inventory'); onClose?.(); }}>
              <div className="low-stock-item-name">{p.name}</div>
              <div className="low-stock-item-stock">
                {p.stock === 0 ? 'Out of stock' : `Only ${p.stock} items remaining`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        {user?.role === 'OWNER' && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Settings size={16} />
            Settings
          </NavLink>
        )}
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>
          <LogOut size={16} />
          Sign Out
        </button>
        <div style={{ padding: '8px 10px', marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.role}</div>
        </div>
      </div>
    </aside>
  );
}
