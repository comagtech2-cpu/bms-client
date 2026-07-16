import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, Settings, Sun, Moon, Package, Users, CheckCheck, Trash2, RefreshCw, PackageMinus, AlertCircle, FileText, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import api from '../../api/axios';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Business Overview Dashboard',
  '/sales': 'POS Checkout',
  '/products': 'Inventory & Items',
  '/categories': 'Product Categories',
  '/inventory': 'Stock Management',
  '/customers': 'Customers',
  '/credit': 'Credit Tracking',
  '/transactions': 'Transaction History',
  '/reports': 'Business Reports & Insights',
  '/settings': 'System Settings',
};

const NOTIF_ICONS: Record<string, any> = {
  low_stock: PackageMinus,
  credit_due: AlertCircle,
  daily_summary: FileText,
  info: Bell,
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const {
    notifications, unreadCount, totalPages: notifPages,
    fetchNotifications, fetchUnreadCount, markAsRead,
    markAllAsRead, generateNotifications, clearAll,
  } = useNotificationStore();

  const { data: business } = useQuery<{ name: string }>({
    queryKey: ['business'],
    queryFn: () => api.get('/settings/business').then((r) => r.data),
  });

  const title = PAGE_TITLES[location.pathname] ?? business?.name ?? 'Dashboard';
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
  const [logoError, setLogoError] = useState(false);

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notifFetching, setNotifFetching] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (showNotifs) {
      setNotifFetching(true);
      fetchNotifications(notifPage).then(() => setNotifFetching(false));
    }
  }, [showNotifs, notifPage, fetchNotifications]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      setCustomers([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const [prodRes, custRes] = await Promise.all([
          api.get(`/products`, { params: { search: query } }),
          api.get(`/customers`, { params: { search: query } })
        ]);
        setProducts((prodRes.data.data ?? prodRes.data).slice(0, 4));
        setCustomers(custRes.data.slice(0, 4));
      } catch (e) {
        console.error('Search query failed', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (path: string, searchVal: string) => {
    setShowResults(false);
    setQuery('');
    navigate(`${path}?search=${encodeURIComponent(searchVal)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setShowResults(false);
      setQuery('');
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleNotifClick = useCallback((notif: any) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.link) {
      setShowNotifs(false);
      navigate(notif.link);
    }
  }, [markAsRead, navigate]);

  return (
    <header className="topbar">
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
        <Menu size={16} />
      </button>
      <div className="topbar-title">
        <span>{title}</span>
      </div>

      <div className="topbar-search" style={{ position: 'relative' }} ref={dropdownRef}>
        <Search className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Search items, customers..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
        />

        {showResults && query.trim().length >= 2 && (
          <div style={{
            position: 'absolute', top: '105%', left: 0, right: 0,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow)',
            zIndex: 1000, overflow: 'hidden', maxHeight: 350, display: 'flex', flexDirection: 'column'
          }}>
            {loading && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Searching...
              </div>
            )}

            {!loading && products.length === 0 && customers.length === 0 && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                No results found for "{query}"
              </div>
            )}

            {products.length > 0 && (
              <div>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-input)' }}>
                  Inventory Items
                </div>
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectResult('/products', p.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.2s'
                    }}
                    className="search-result-item"
                  >
                    <Package size={14} style={{ color: 'var(--accent-blue)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customers.length > 0 && (
              <div>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-input)' }}>
                  Customers
                </div>
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectResult('/customers', c.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.2s'
                    }}
                    className="search-result-item"
                  >
                    <Users size={14} style={{ color: 'var(--accent-purple)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button className="topbar-btn" id="topbar-theme-toggle" aria-label="Toggle Theme" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div style={{ position: 'relative' }} ref={notifDropdownRef}>
          <button
            className="topbar-btn"
            id="topbar-notifications"
            aria-label="Notifications"
            onClick={() => setShowNotifs((v) => !v)}
            style={{ position: 'relative' }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--accent-red, #ef4444)', color: '#fff',
                fontSize: 9, fontWeight: 700, lineHeight: '14px',
                width: unreadCount > 9 ? 18 : 14, height: 14, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {unreadCount > 0 && (
                    <button className="notif-action-btn" onClick={markAllAsRead} title="Mark all read">
                      <CheckCheck size={13} />
                    </button>
                  )}
                  <button className="notif-action-btn" onClick={generateNotifications} title="Refresh">
                    <RefreshCw size={13} />
                  </button>
                  <button className="notif-action-btn" onClick={clearAll} title="Clear all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="notif-list">
                {notifFetching && notifications.length === 0 && (
                  <div className="notif-empty">Loading...</div>
                )}
                {!notifFetching && notifications.length === 0 && (
                  <div className="notif-empty">No notifications yet</div>
                )}
                {notifications.map((n) => {
                  const Icon = NOTIF_ICONS[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? '' : 'unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className={`notif-icon-wrap notif-icon-${n.type}`}>
                        <Icon size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{n.message}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                      </div>
                      {!n.read && <div className="notif-unread-dot" />}
                    </div>
                  );
                })}
              </div>

              {notifPages > 1 && (
                <div className="notif-footer">
                  <button
                    className="notif-page-btn"
                    disabled={notifPage <= 1}
                    onClick={() => setNotifPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {notifPage} / {notifPages}
                  </span>
                  <button
                    className="notif-page-btn"
                    disabled={notifPage >= notifPages}
                    onClick={() => setNotifPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {user?.role === 'OWNER' && (
          <button className="topbar-btn" id="topbar-settings" aria-label="Settings" onClick={() => navigate('/settings')}>
            <Settings size={15} />
          </button>
        )}
        <div className="topbar-user" id="topbar-user">
          <div className="user-avatar" style={{ overflow: 'hidden', padding: 0 }}>
            {!logoError ? (
              <img
                src="/mylogo.png"
                alt="User Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
