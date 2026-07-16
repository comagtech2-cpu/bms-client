import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import api from '../api/axios';
import type { Product, StockMovement } from '../types';

const restockSchema = z.object({
  productId: z.string().min(1, 'Product required'),
  qty: z.coerce.number().int().positive('Quantity must be positive'),
  note: z.string().optional(),
});

function RestockModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(restockSchema) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/restock', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      onClose();
    },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Restock Product</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Product</label>
            <select className="form-control" {...register('productId')}>
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.stock})
                </option>
              ))}
            </select>
            {errors.productId && <div className="form-error">{errors.productId.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Quantity to Add</label>
            <input type="number" className="form-control" placeholder="e.g. 50" {...register('qty')} />
            {errors.qty && <div className="form-error">{errors.qty.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-control" placeholder="e.g. Supplier delivery" {...register('note')} />
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovementIcon({ type }: { type: string }) {
  if (type === 'IN') return <TrendingUp size={14} color="var(--accent-green)" />;
  if (type === 'OUT') return <TrendingDown size={14} color="var(--accent-red)" />;
  return <Minus size={14} color="var(--accent-orange)" />;
}

export default function Inventory() {
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const { data: inventory } = useQuery({
    queryKey: ['inventory', page],
    queryFn: () => api.get('/inventory/movements', { params: { page, limit: 20 } }).then((r) => r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data ?? r.data),
  });

  const movements: StockMovement[] = inventory?.movements ?? [];
  const total = inventory?.total ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Stock Management</div>
          <div className="page-subtitle">Track all inventory movements and restock history</div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} id="restock-btn">
          <Plus size={14} /> Restock
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid-3 mb-16">
        {[
          { label: 'Total Products', value: products.length, color: 'blue' },
          { label: 'Low Stock Items', value: products.filter((p) => p.stock <= p.minStock && p.stock > 0).length, color: 'orange' },
          { label: 'Out of Stock', value: products.filter((p) => p.stock === 0).length, color: 'red' },
        ].map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.color}`}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ fontSize: 28 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Warehouse size={16} color="var(--accent-blue)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Stock Movement Log</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{total} total entries</span>
        </div>
        {movements.length === 0 ? (
          <div className="empty-state">
            <Warehouse size={40} className="empty-icon" />
            <div className="empty-title">No movements yet</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Note</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MovementIcon type={m.type} />
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: m.type === 'IN' ? 'var(--accent-green)' : m.type === 'OUT' ? 'var(--accent-red)' : 'var(--accent-orange)',
                      }}>{m.type}</span>
                    </div>
                  </td>
                  <td className="td-name">{m.product?.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.product?.category?.name}</td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: 13,
                      color: m.type === 'IN' ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>
                      {m.type === 'IN' ? '+' : '-'}{m.qty}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.note ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {format(new Date(m.createdAt), 'MMM d, hh:mm aa')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 20 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page}</span>
            <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>›</button>
          </div>
        )}
      </div>

      {showModal && <RestockModal products={products} onClose={() => setShowModal(false)} />}
    </div>
  );
}
