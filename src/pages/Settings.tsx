import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Shield, Layers, Save, Users, Plus, Trash2, ScrollText } from 'lucide-react';
import api from '../api/axios';
import type { BusinessProfile, User } from '../types';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  name: z.string().min(1, 'Business name required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  tagline: z.string().optional(),
  vatRate: z.coerce.number().min(0, 'VAT rate must be >= 0').max(100, 'VAT rate must be <= 100').optional(),
});

type FormData = z.infer<typeof schema>;

type SettingsTab = 'profile' | 'modules' | 'security' | 'staff' | 'audit';

const actionColors: Record<string, string> = {
  CREATE: 'var(--accent-green)',
  UPDATE: 'var(--accent-blue)',
  DELETE: 'var(--accent-red)',
};

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: res, isLoading } = useQuery<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['audit-logs', { page, entity: entityFilter, action: actionFilter }],
    queryFn: () => api.get('/audit-logs', {
      params: { page, limit: 30, entity: entityFilter || undefined, action: actionFilter || undefined },
    }).then((r) => r.data),
  });

  const logs = res?.data ?? [];
  const totalPages = res?.totalPages ?? 1;
  const total = res?.total ?? 0;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Audit Log</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Track all changes made to your business data</div>

      <div className="d-flex gap-8 mb-16">
        <select className="form-control" style={{ width: 150 }} value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          <option value="Product">Products</option>
          <option value="Category">Categories</option>
          <option value="Customer">Customers</option>
          <option value="Transaction">Transactions</option>
          <option value="StockMovement">Stock Movements</option>
          <option value="User">Users</option>
          <option value="BusinessProfile">Business Profile</option>
        </select>
        <select className="form-control" style={{ width: 130 }} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {isLoading ? (
          <div className="loading-state"><div className="loading-spinner" /></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No audit logs found</div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 12 }}>{log.userId?.name || '—'}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: `${actionColors[log.action] || '#888'}22`,
                        color: actionColors[log.action] || '#888',
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{log.entity}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.action === 'DELETE' && log.before?.name ? log.before.name : log.after?.name || log.entityId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {total} total entries
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn-icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '' }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/change-password', data).then((r) => r.data),
    onSuccess: () => {
      alert('Password changed successfully');
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Change Password</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-control" type="password" placeholder="••••••" {...register('currentPassword', { required: 'Current password is required' })} />
            {errors.currentPassword && <div className="form-error">{errors.currentPassword.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-control" type="password" placeholder="••••••" {...register('newPassword', { required: 'New password is required', minLength: { value: 6, message: 'Min 6 characters' } })} />
            {errors.newPassword && <div className="form-error">{errors.newPassword.message as string}</div>}
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message ?? 'An error occurred'}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffModal({ staff, onClose, onSave }: { staff?: User | null; onClose: () => void; onSave: () => void }) {
  const isEdit = !!staff;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: staff ? { name: staff.name, email: staff.email, role: staff.role, password: '' } : { name: '', email: '', role: 'STAFF' as const, password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (isEdit && !payload.password) {
        delete payload.password;
      }
      return isEdit
        ? api.put(`/settings/staff/${staff!.id}`, payload).then((r) => r.data)
        : api.post('/settings/staff', payload).then((r) => r.data);
    },
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-control" placeholder="e.g. John Doe" {...register('name', { required: 'Name is required' })} />
            {errors.name && <div className="form-error">{errors.name.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="john@example.com" {...register('email', { required: 'Email is required' })} />
            {errors.email && <div className="form-error">{errors.email.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Password {isEdit && '(leave blank to keep current)'}</label>
            <input className="form-control" type="password" placeholder="••••••" {...register('password', { required: !isEdit ? 'Password is required' : false, minLength: { value: 6, message: 'Min 6 characters' } })} />
            {errors.password && <div className="form-error">{errors.password.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" {...register('role')}>
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message ?? 'An error occurred'}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

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
      stock_only: false,
    };
  });

  const handleToggleModule = (moduleId: string) => {
    const updated = { ...activeModules, [moduleId]: !activeModules[moduleId] };
    setActiveModules(updated);
    localStorage.setItem('bms_modules', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage-modules-updated'));
  };

  const { data: staffList = [], refetch: refetchStaff } = useQuery<User[]>({
    queryKey: ['settings-staff'],
    queryFn: () => api.get('/settings/staff').then((r) => r.data),
    enabled: tab === 'staff' && user?.role === 'OWNER',
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/staff/${id}`),
    onSuccess: () => {
      refetchStaff();
    },
  });

  const handleDeleteStaff = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete staff member "${name}"?`)) {
      deleteStaffMutation.mutate(id);
    }
  };

  const { data: business } = useQuery<BusinessProfile>({
    queryKey: ['business'],
    queryFn: () => api.get('/settings/business').then((r) => r.data),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['business'], data);
      qc.invalidateQueries({ queryKey: ['business'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message ?? 'Failed to upload logo');
    },
    onSettled: () => setUploading(false),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit');
        return;
      }
      setUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/settings/business', { logo: '' });
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['business'], data);
      qc.invalidateQueries({ queryKey: ['business'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message ?? 'Failed to remove logo');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '', currency: '$', tagline: '', vatRate: 7.5 },
  });

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.put('/settings/business', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'modules', label: 'App Modules', icon: Layers },
    { id: 'security', label: 'Security', icon: Shield },
  ];
  if (user?.role === 'OWNER') {
    tabs.push({ id: 'staff', label: 'Staff Management', icon: Users });
    tabs.push({ id: 'audit', label: 'Audit Log', icon: ScrollText });
  }

  const modules = [
    { id: 'pos', label: 'POS / Sales Checkout', desc: 'Process sales and generate receipts', enabled: activeModules.pos },
    { id: 'inventory', label: 'Inventory Management', desc: 'Track stock levels and movements', enabled: activeModules.inventory },
    { id: 'customers', label: 'Customer Management', desc: 'Manage customer profiles and history', enabled: activeModules.customers },
    { id: 'credit', label: 'Credit Tracking', desc: 'Track customer outstanding balances', enabled: activeModules.credit },
    { id: 'reports', label: 'Business Reports', desc: 'Analytics and performance insights', enabled: activeModules.reports },
    { id: 'staff', label: 'Staff Management', desc: 'Manage staff accounts and roles', enabled: activeModules.staff },
    { id: 'cost_tracking', label: 'Cost Price Tracking', desc: 'Enable cost price fields and calculate profit margins', enabled: activeModules.cost_tracking !== false },
    { id: 'stock_only', label: 'Stock-Only Mode', desc: 'Allow adding products without a selling price — track inventory only', enabled: !!activeModules.stock_only },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings & Configuration</div>
          <div className="page-subtitle">Manage your business profile and application behavior</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Settings Nav */}
        <div className="card" style={{ padding: 8, height: 'fit-content' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              id={`settings-tab-${t.id}`}
              style={{ width: '100%', marginBottom: 2 }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="card">
          {tab === 'profile' && (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Business Profile</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Update your business information and branding
              </div>

              {/* Logo */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Company Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
                  {business?.logo ? (
                    <img
                      src={business.logo}
                      alt="Company Logo"
                      style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div style={{
                      width: 70, height: 70, borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 800, color: 'white',
                    }}>
                      {(business?.name ?? 'N').charAt(0)}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      accept="image/*"
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      JPG, PNG or SVG. Max size 2MB.
                    </div>
                    <div className="d-flex gap-8">
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Upload New'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        onClick={() => confirm('Remove logo?') && removeLogoMutation.mutate()}
                        disabled={!business?.logo || removeLogoMutation.isPending}
                      >
                        {removeLogoMutation.isPending ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input className="form-control" placeholder="My Business" {...register('name')} id="settings-business-name" />
                  {errors.name && <div className="form-error">{errors.name.message}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-control" placeholder="+1 (555) 000-0000" {...register('phone')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Address</label>
                <textarea className="form-control" rows={3} placeholder="123 Commerce Avenue..." {...register('address')} style={{ resize: 'vertical' }} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <select className="form-control" {...register('currency')}>
                    <option value="$">$ — US Dollar</option>
                    <option value="₦">₦ — Nigerian Naira</option>
                    <option value="€">€ — Euro</option>
                    <option value="£">£ — British Pound</option>
                    <option value="₹">₹ — Indian Rupee</option>
                    <option value="GH₵">GH₵ — Ghanaian Cedi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Tagline</label>
                  <input className="form-control" placeholder="Your tagline" {...register('tagline')} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">VAT Rate (%)</label>
                  <input type="number" step="0.1" className="form-control" placeholder="7.5" {...register('vatRate')} />
                  {errors.vatRate && <div className="form-error">{errors.vatRate.message}</div>}
                </div>
              </div>

              {business?.slug && (
                <div className="form-group" style={{ marginTop: 8, background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ marginBottom: 4, display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>Workspace Login Link</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="form-control"
                      readOnly
                      value={`${window.location.origin}/login?b=${business.slug}`}
                      style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-body)' }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/login?b=${business.slug}`);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}

              {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
              {saved && <div className="alert alert-success">Settings saved successfully!</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => reset(business ?? {})}>Discard Changes</button>
                <button type="submit" className="btn-primary" disabled={mutation.isPending} id="settings-save-btn">
                  <Save size={14} /> {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {tab === 'modules' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>App Modules</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Enable or disable features for your business
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {modules.map((mod) => (
                  <div key={mod.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'var(--bg-input)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{mod.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{mod.desc}</div>
                    </div>
                    <button
                      onClick={() => handleToggleModule(mod.id)}
                      style={{
                        width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
                        background: mod.enabled ? 'var(--accent-blue)' : 'var(--border)',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, transition: 'left 0.2s',
                        left: mod.enabled ? 20 : 3,
                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Security</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Manage access and authentication</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', background: 'var(--bg-input)',
                  border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Change Password</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Update your account password</div>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowPasswordModal(true)}>Manage</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'staff' && user?.role === 'OWNER' && (
            <div>
              <div className="d-flex justify-between align-center mb-16">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Staff Management</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Manage user accounts and permission levels
                  </div>
                </div>
                <button className="btn-primary" onClick={() => { setEditingStaff(null); setShowStaffModal(true); }}>
                  <Plus size={14} style={{ marginRight: 4 }} /> Add Staff
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s: User) => (
                        <tr key={s.id}>
                          <td>
                            <span style={{ fontWeight: 600 }}>{s.name}</span>{' '}
                            {user?.id === s.id && <span style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 700, background: 'rgba(79,124,255,0.1)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>You</span>}
                          </td>
                          <td>{s.email}</td>
                          <td>
                            <span className={`badge badge-${s.role.toLowerCase()}`}>{s.role}</span>
                          </td>
                          <td>
                            <div className="d-flex gap-8">
                              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setEditingStaff(s); setShowStaffModal(true); }}>
                                Edit
                              </button>
                              {user?.id !== s.id && (
                                <button className="btn-icon danger" onClick={() => handleDeleteStaff(s.id, s.name)}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'audit' && user?.role === 'OWNER' && <AuditLogTab />}
        </div>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showStaffModal && <StaffModal staff={editingStaff} onClose={() => { setShowStaffModal(false); setEditingStaff(null); }} onSave={refetchStaff} />}
    </div>
  );
}
