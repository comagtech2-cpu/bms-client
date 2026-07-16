import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import type { Category } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const PRESET_COLORS = [
  '#4f7cff', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

function CategoryModal({ category, onClose }: { category?: Category; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!category;
  const [color, setColor] = useState(category?.color ?? '#4f7cff');
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: category ? { name: category.name, icon: category.icon } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? api.put(`/categories/${category!.id}`, { ...data, color }).then((r) => r.data)
      : api.post('/categories', { ...data, color }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); onClose(); },
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input className="form-control" placeholder="e.g. Drinks & Beverages" {...register('name')} />
            {errors.name && <div className="form-error">{errors.name.message as string}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2, transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Icon (optional)</label>
            <input className="form-control" placeholder="e.g. coffee, package, shirt" {...register('icon')} />
          </div>
          {mutation.isError && <div className="alert alert-error">{(mutation.error as any)?.response?.data?.message}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | undefined>();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Product Categories</div>
          <div className="page-subtitle">Organize your products into groups</div>
        </div>
        <button className="btn-primary" onClick={() => { setEditCat(undefined); setShowModal(true); }} id="add-category-btn">
          <Plus size={14} /> New Category
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state"><div className="loading-spinner" /></div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <Tag size={40} className="empty-icon" />
          <div className="empty-title">No categories yet</div>
          <div className="empty-desc">Create your first product category</div>
        </div>
      ) : (
        <div className="category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {categories.map((cat) => (
            <div key={cat.id} className="card" style={{ padding: 16 }}>
              <div className="d-flex justify-between align-center mb-12">
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${cat.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  <Tag size={20} color={cat.color} />
                </div>
                <div className="d-flex gap-8">
                  <button className="btn-icon" onClick={() => { setEditCat(cat); setShowModal(true); }}>
                    <Pencil size={12} />
                  </button>
                  {user?.role === 'OWNER' && (
                    <button className="btn-icon danger" onClick={() => {
                      if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id);
                    }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {cat._count?.products ?? 0} products
              </div>
              <div style={{
                display: 'inline-block', marginTop: 8,
                padding: '2px 10px', borderRadius: 99,
                background: `${cat.color}22`, color: cat.color,
                fontSize: 11, fontWeight: 600,
              }}>
                {cat.icon ?? 'general'}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editCat}
          onClose={() => { setShowModal(false); setEditCat(undefined); }}
        />
      )}
    </div>
  );
}
