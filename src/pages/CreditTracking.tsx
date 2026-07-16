import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, DollarSign, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import { useAuthStore } from '../store/authStore';
import type { Customer } from '../types';

const paymentSchema = z.object({
  creditRecordId: z.string(),
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER']),
  note: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

function RecordPaymentModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const currency = useCurrency();
  const qc = useQueryClient();
  const unpaidRecords = customer.creditRecords?.filter((r) => r.paid < r.amount) ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      creditRecordId: unpaidRecords[0]?.id,
      amount: undefined as any,
      method: 'CASH',
      note: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/customers/${customer.id}/payment`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers-credit'] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Record Payment — {customer.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Outstanding Balance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-red)' }}>{currency}{customer.totalCredit.toFixed(2)}</div>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          {unpaidRecords.length > 1 && (
            <div className="form-group">
              <label className="form-label">Credit Record</label>
              <select className="form-control" {...register('creditRecordId')}>
                {unpaidRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {currency}{(r.amount - r.paid).toFixed(2)} remaining
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Amount Paying ({currency})</label>
            <input type="number" step="0.01" className="form-control" placeholder="0.00" {...register('amount')} />
            {errors.amount && <div className="form-error">{errors.amount.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-control" {...register('method')}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-control" placeholder="e.g. Partial payment" {...register('note')} />
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              <CheckCircle size={14} /> {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreditTracking() {
  const currency = useCurrency();
  const { user } = useAuthStore();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers-credit'],
    queryFn: () => api.get('/customers/credit/overview').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const totalOutstanding = customers.reduce((s, c) => s + c.totalCredit, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Credit Tracking</div>
          <div className="page-subtitle">Track outstanding customer balances and record payments</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3 mb-16">
        <div className="stat-card red">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{currency}{totalOutstanding.toFixed(2)}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Customers with Debt</div>
          <div className="stat-value" style={{ fontSize: 28 }}>{customers.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Avg. Balance</div>
          <div className="stat-value" style={{ fontSize: 24 }}>
            {currency}{customers.length > 0 ? (totalOutstanding / customers.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state"><div className="loading-spinner" /></div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={40} className="empty-icon" />
          <div className="empty-title">No outstanding credit</div>
          <div className="empty-desc">All customers are fully paid up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map((c) => (
            <div key={c.id} className="card" style={{ padding: 16 }}>
              <div className="d-flex justify-between align-center">
                <div className="d-flex align-center gap-12">
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent-red), var(--accent-purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: 'white',
                  }}>
                    {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.phone} • {c._count?.transactions ?? 0} transactions
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {c.creditRecords?.filter((r) => r.paid < r.amount).length ?? 0} unpaid credit records
                    </div>
                  </div>
                </div>
                <div className="d-flex align-center gap-12">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outstanding</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-red)' }}>
                      {currency}{c.totalCredit.toFixed(2)}
                    </div>
                  </div>
                  {user?.role === 'OWNER' && (
                    <button
                      className="btn-primary"
                      onClick={() => setSelectedCustomer(c)}
                      id={`record-payment-${c.id}`}
                    >
                      <DollarSign size={14} /> Record Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Credit Records */}
              {c.creditRecords && c.creditRecords.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {c.creditRecords.filter((r) => r.paid < r.amount).map((record) => (
                    <div key={record.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 6,
                      marginBottom: 4, border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Record #{record.id}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                          {format(new Date(record.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Paid: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{currency}{record.paid.toFixed(2)}</span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Remaining: <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{currency}{(record.amount - record.paid).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <RecordPaymentModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      )}
    </div>
  );
}
