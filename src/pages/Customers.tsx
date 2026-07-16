import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Phone, Mail, ShoppingBag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import type { Customer } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  phone: z.string().optional(),
  email: z.string().optional(),
});

function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!customer;
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : {},
  });
  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? api.put(`/customers/${customer!.id}`, data).then((r) => r.data)
      : api.post('/customers', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
  });
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-control" placeholder="e.g. James Wilson" {...register('name')} />
            {errors.name && <div className="form-error">{errors.name.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-control" placeholder="e.g. 555-0101" {...register('phone')} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" placeholder="email@example.com" {...register('email')} />
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const currency = useCurrency();
  const [search, setSearch] = useState(urlSearch);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();

  const { data, isLoading } = useQuery<{ customers: Customer[]; total: number; totalPages: number }>({
    queryKey: ['customers', search, page],
    queryFn: () => api.get('/customers', { params: { search: search || undefined, page, limit: 15 } }).then((r) => r.data),
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

  const totalCredit = customers.reduce((s, c) => s + c.totalCredit, 0);
  const withCredit = customers.filter((c) => c.totalCredit > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">Manage customer profiles and purchase history</div>
        </div>
        <button className="btn-primary" onClick={() => { setEditCustomer(undefined); setShowModal(true); }} id="add-customer-btn">
          <Plus size={14} /> New Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3 mb-16">
        <div className="stat-card blue">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value" style={{ fontSize: 28 }}>{customers.length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Customers with Credit</div>
          <div className="stat-value" style={{ fontSize: 28 }}>{withCredit}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{currency}{totalCredit.toFixed(2)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="d-flex gap-8 mb-16">
        <div className="search-bar">
          <Search className="search-bar-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." id="customers-search" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="loading-state"><div className="loading-spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {customers.length === 0 ? (
            <div className="empty-state">
              <Users size={40} className="empty-icon" />
              <div className="empty-title">No customers found</div>
              <div className="empty-desc">Add your first customer to start tracking sales</div>
            </div>
          ) : (            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Transactions</th>
                    <th>Outstanding Credit</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="d-flex align-center gap-8">
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0,
                          }}>
                            {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="td-name">{c.name}</div>
                            {c.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {c.phone ? <><Phone size={11} style={{ marginRight: 4 }} />{c.phone}</> : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <ShoppingBag size={11} /> {c._count?.transactions ?? 0}
                        </div>
                      </td>
                      <td>
                        {c.totalCredit > 0 ? (
                          <span className="badge badge-credit">{currency}{c.totalCredit.toFixed(2)}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>✓ Clear</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => { setEditCustomer(c); setShowModal(true); }}>
                          Edit
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
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CustomerModal customer={editCustomer} onClose={() => { setShowModal(false); setEditCustomer(undefined); }} />
      )}
    </div>
  );
}
