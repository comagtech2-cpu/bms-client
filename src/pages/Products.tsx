import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Package, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useCurrency } from '../hooks/useCurrency';
import { useAuthStore } from '../store/authStore';
import type { Product, Category } from '../types';

const makeSchema = (stockOnly: boolean) => z.object({
  name: z.string().min(1, 'Name required'),
  sku: z.string().optional(),
  price: stockOnly
    ? z.coerce.number().min(0).optional().default(0)
    : z.coerce.number().positive('Price must be positive'),
  cost: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  categoryId: z.string().min(1, 'Category required'),
});

type FormData = z.infer<ReturnType<typeof makeSchema>>;

function ProductModal({ product, categories, onClose }: {
  product?: Product; categories: Category[]; onClose: () => void;
}) {
  const showCostTracking = JSON.parse(localStorage.getItem('bms_modules') || '{}').cost_tracking !== false;
  const stockOnlyMode = !!JSON.parse(localStorage.getItem('bms_modules') || '{}').stock_only;
  const schema = makeSchema(stockOnlyMode);
  const currency = useCurrency();
  const qc = useQueryClient();
  const isEdit = !!product;
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      name: product.name, sku: product.sku, price: product.price,
      cost: product.cost, stock: product.stock, minStock: product.minStock,
      categoryId: product.categoryId,
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit
      ? api.put(`/products/${product!.id}`, data).then((r) => r.data)
      : api.post('/products', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose(); },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input className="form-control" placeholder="e.g. Arabica Coffee" {...register('name')} />
              {errors.name && <div className="form-error">{errors.name.message}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              {isEdit ? (
                <input className="form-control" readOnly disabled style={{ opacity: 0.6 }} {...register('sku')} />
              ) : (
                <input className="form-control" placeholder="Auto-generated (or type your own)" {...register('sku')} />
              )}
            </div>
          </div>
          {showCostTracking ? (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Selling Price ({currency}){stockOnlyMode && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>— optional</span>}</label>
                <input type="number" step="0.01" className="form-control" placeholder={stockOnlyMode ? 'Leave empty for stock-only' : '0.00'} {...register('price')} />
                {errors.price && <div className="form-error">{errors.price.message}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price ({currency})</label>
                <input type="number" step="0.01" className="form-control" placeholder="0.00" {...register('cost')} />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Selling Price ({currency}){stockOnlyMode && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>— optional</span>}</label>
              <input type="number" step="0.01" className="form-control" placeholder={stockOnlyMode ? 'Leave empty for stock-only' : '0.00'} {...register('price')} />
              {errors.price && <div className="form-error">{errors.price.message}</div>}
            </div>
          )}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Current Stock</label>
              <input type="number" className="form-control" placeholder="0" {...register('stock')} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Stock Alert</label>
              <input type="number" className="form-control" placeholder="5" {...register('minStock')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-control" {...register('categoryId')}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <div className="form-error">{errors.categoryId.message}</div>}
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) return <span className="badge badge-out-of-stock">0 units</span>;
  if (stock <= minStock) return <span className="badge badge-low-stock">{stock} units</span>;
  return <span className="badge badge-in-stock">{stock} units</span>;
}

export default function Products() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const currency = useCurrency();
  const qc = useQueryClient();
  const [search, setSearch] = useState(urlSearch);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const { user } = useAuthStore();

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();

  const { data: res, isLoading } = useQuery<{
    data: Product[];
    total: number;
    page: number;
    totalPages: number;
    summary: { totalValue: number; lowStockCount: number };
  }>({
    queryKey: ['products', { search, categoryId: categoryFilter, page, limit }],
    queryFn: () => api.get('/products', {
      params: { search: search || undefined, categoryId: categoryFilter || undefined, page, limit },
    }).then((r) => r.data),
  });

  const products = res?.data ?? [];
  const totalPages = res?.totalPages ?? 1;
  const total = res?.total ?? 0;

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const restockMutation = useMutation({
    mutationFn: (data: { productId: string; qty: number }) =>
      api.post('/inventory/restock', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setRestockId(null);
      setRestockQty('');
    },
  });

  return (
    <div>
      {/* Main */}
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Items & Stock</div>
            <div className="page-subtitle">Manage your catalog and monitor real-time stock levels</div>
          </div>
          <button className="btn-primary" onClick={() => { setEditProduct(undefined); setShowModal(true); }} id="add-product-btn">
            <Plus size={14} /> Add New Item
          </button>
        </div>

        {/* Filters */}
        <div className="d-flex gap-8 mb-16">
          <div className="search-bar">
            <Search className="search-bar-icon" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item name or category..." id="products-search" />
          </div>
          <select className="form-control" style={{ width: 160 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div className="loading-state"><div className="loading-spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <Package size={40} className="empty-icon" />
              <div className="empty-title">No products found</div>
              <div className="empty-desc">Add your first product to get started</div>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-center gap-8">
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: `linear-gradient(135deg, ${p.category?.color ?? '#4f7cff'}22, ${p.category?.color ?? '#4f7cff'}44)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, color: p.category?.color ?? 'var(--accent-blue)',
                          }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="td-name">{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 99,
                          background: `${p.category?.color ?? '#4f7cff'}22`,
                          color: p.category?.color ?? 'var(--accent-blue)',
                          fontWeight: 600,
                        }}>
                          {p.category?.name ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.price > 0 ? `${currency}${p.price.toFixed(2)}` : <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>No price</span>}</td>
                      <td><StockBadge stock={p.stock} minStock={p.minStock} /></td>
                      <td>
                        <div className="d-flex gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          {restockId === p.id ? (
                            <div className="d-flex gap-4" style={{ alignItems: 'center' }}>
                              <input
                                type="number"
                                min={1}
                                className="form-control"
                                style={{ width: 64, height: 28, fontSize: 12, padding: '0 6px' }}
                                placeholder="Qty"
                                autoFocus
                                value={restockQty}
                                onChange={(e) => setRestockQty(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const qty = parseInt(restockQty);
                                    if (qty > 0) restockMutation.mutate({ productId: p.id, qty });
                                  }
                                  if (e.key === 'Escape') { setRestockId(null); setRestockQty(''); }
                                }}
                              />
                              <button
                                className="btn-icon"
                                style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                                onClick={() => {
                                  const qty = parseInt(restockQty);
                                  if (qty > 0) restockMutation.mutate({ productId: p.id, qty });
                                }}
                                title="Confirm"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                className="btn-icon"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                onClick={() => { setRestockId(null); setRestockQty(''); }}
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <>
                              {user?.role === 'OWNER' && (
                                <button
                                  className="btn-icon"
                                  style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                                  onClick={() => { setRestockId(p.id); setRestockQty(''); }}
                                  title="Add stock"
                                >
                                  <Plus size={13} />
                                </button>
                              )}
                              <button
                                className="btn-icon"
                                style={{ color: '#4f7cff', background: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.25)' }}
                                onClick={() => { setEditProduct(p); setShowModal(true); }}
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              {user?.role === 'OWNER' && (
                                <button
                                  className="btn-icon"
                                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                                  onClick={() => {
                                    if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id);
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
            Showing {products.length} of {total} items
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        minWidth: 28, height: 28, borderRadius: 6, border: 'none',
                        background: p === page ? 'var(--accent-blue)' : 'transparent',
                        color: p === page ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button className="btn-icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => { setShowModal(false); setEditProduct(undefined); }}
        />
      )}
    </div>
  );
}
