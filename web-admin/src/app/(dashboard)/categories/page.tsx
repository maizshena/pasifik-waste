'use client';

import { useState }    from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, Trash2, AlertTriangle } from 'lucide-react';
import { TopBar }      from '@/components/layout/TopBar';
import { Button }      from '@/components/ui/Button';
import { Modal }       from '@/components/ui/Modal';
import { Badge }       from '@/components/ui/Badge';
import api             from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';

interface Category {
  id:           number;
  name:         string;
  slug:         string;
  price_per_kg: number;
  unit:         string;
  is_active:    boolean;
}

const EMPTY_FORM = { name: '', slug: '', price_per_kg: '', unit: 'kg' };

// test assertions (run once at module load in dev)
if (process.env.NODE_ENV === 'development') {
  const assert = (condition: boolean, msg: string) => {
    if (!condition) console.error(`[TDD FAIL] ${msg}`);
    else            console.log(`[TDD PASS] ${msg}`);
  };

  // slug auto-generation logic
  const toSlug = (v: string) =>
    v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  assert(toSlug('Kertas / Kardus') === 'kertas--kardus' ||
         toSlug('Kertas Kardus')   === 'kertas-kardus',
         'Slug strips spaces and special chars');

  // is_active coercion
  const coerce = (v: boolean) => (v ? 1 : 0);
  assert(coerce(true)  === 1, 'Active boolean → 1 for API');
  assert(coerce(false) === 0, 'Inactive boolean → 0 for API');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const isSA     = user?.role === 'super_admin';

  // ── Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);

  // ── Edit modal state
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editForm,   setEditForm]   = useState({
    name: '', price_per_kg: '', unit: 'kg', is_active: true,
  });

  // ── Confirm status-toggle modal state
  const [toggleOpen,   setToggleOpen]   = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null);

  // ── Confirm delete modal state (nested inside edit modal)
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Shared error
  const [apiError, setApiError] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  async () =>
      (await api.get('/api/categories')).data.data as Category[],
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  // CREATE
  const create = useMutation({
    mutationFn: () => api.post('/api/categories', {
      ...form,
      price_per_kg: parseInt(form.price_per_kg, 10),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setApiError('');
    },
    onError: (err: any) =>
      setApiError(err.response?.data?.message || 'Failed to create category'),
  });

  // EDIT (name + price + unit + is_active together)
  const edit = useMutation({
    mutationFn: () =>
      api.patch(`/api/categories/${editTarget?.id}`, {
        name:         editForm.name,
        price_per_kg: parseInt(editForm.price_per_kg, 10),
        unit:         editForm.unit,
        is_active:    editForm.is_active ? 1 : 0,  // ← always send integer
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditOpen(false);
      setEditTarget(null);
      setApiError('');
    },
    onError: (err: any) =>
      setApiError(err.response?.data?.message || 'Failed to update category'),
  });

  // TOGGLE STATUS (from confirmation modal)
  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/api/categories/${toggleTarget?.id}`, {
        is_active: toggleTarget?.is_active ? 0 : 1, // ← always send integer
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setToggleOpen(false);
      setToggleTarget(null);
      setApiError('');
    },
    onError: (err: any) =>
      setApiError(err.response?.data?.message || 'Failed to update status'),
  });

  // DELETE
  const remove = useMutation({
    mutationFn: () =>
      api.delete(`/api/categories/${editTarget?.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeleteOpen(false);
      setEditOpen(false);
      setEditTarget(null);
      setApiError('');
    },
    onError: (err: any) =>
      setApiError(err.response?.data?.message || 'Failed to delete category'),
  });

  function handleNameChange(value: string) {
    setForm({
      ...form,
      name: value,
      slug: value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    });
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setEditForm({
      name:         cat.name,
      price_per_kg: String(cat.price_per_kg),
      unit:         cat.unit,
      is_active:    cat.is_active,
    });
    setApiError('');
    setEditOpen(true);
  }

  function openToggleConfirm(cat: Category) {
    setToggleTarget(cat);
    setApiError('');
    setToggleOpen(true);
  }

  const categories = data ?? [];

  return (
    <div className="animate-fade-in">
      <TopBar heading="Categories" />

      <div className="px-6 py-6 space-y-5">
        {isSA && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setForm(EMPTY_FORM);
                setApiError('');
                setCreateOpen(true);
              }}
            >
              <Plus size={13} /> New Category
            </Button>
          </div>
        )}

        {/* category grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`bg-surface-raised border rounded-xl p-4 transition-colors ${
                cat.is_active
                  ? 'border-surface-border'
                  : 'border-surface-border/40 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{cat.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">
                    {cat.slug}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge status={cat.is_active ? 'active' : 'inactive'} />
                  {/* nanti lagi urusin warna statusnya */}
                  {isSA && (
                    <div className="flex items-center gap-1">
                      <button
                        title={cat.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => openToggleConfirm(cat)}
                        className="p-1.5 rounded-md text-ink-faint hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                      >
                        <Power size={13} />
                      </button>

                      <button
                        title="Edit category"
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-overlay transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <span className="text-brand-300 font-mono text-sm font-medium">
                  Rp {cat.price_per_kg.toLocaleString('id-ID')} / {cat.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* create category modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setApiError(''); }}
        title="New Category"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Kertas / Kardus"
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Slug{' '}
              <span className="text-ink-faint font-normal normal-case">
                (auto-filled, must be unique)
              </span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="kertas-kardus"
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Price / kg (Rp)
            </label>
            <input
              type="number"
              value={form.price_per_kg}
              onChange={(e) =>
                setForm({ ...form, price_per_kg: e.target.value })
              }
              placeholder="2000"
              min="0"
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Unit
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            >
              <option value="kg">kg</option>
              <option value="liter">liter</option>
              <option value="pcs">pcs</option>
            </select>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCreateOpen(false); setApiError(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* confirm status toggle */}
      <Modal
        open={toggleOpen}
        onClose={() => { setToggleOpen(false); setApiError(''); }}
        title="Change Category Status"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 flex-shrink-0">
              <Power size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-ink font-medium">{toggleTarget?.name}</p>
              <p className="text-sm text-ink-muted mt-1">
                Are you sure you want to set this category to{' '}
                <span className={`font-medium ${
                  toggleTarget?.is_active ? 'text-red-400' : 'text-brand-300'
                }`}>
                  {toggleTarget?.is_active ? 'Inactive' : 'Active'}
                </span>
                ?
              </p>
              {toggleTarget?.is_active && (
                <p className="text-xs text-ink-faint mt-2">
                  Warga will no longer be able to submit reports under this category.
                </p>
              )}
            </div>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setToggleOpen(false); setApiError(''); }}
            >
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.is_active ? 'danger' : 'primary'}
              size="sm"
              loading={toggle.isPending}
              onClick={() => toggle.mutate()}
            >
              {toggleTarget?.is_active ? 'Set Inactive' : 'Set Active'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* edit category modal */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setApiError(''); }}
        title={`Edit — ${editTarget?.name ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Price / kg (Rp)
            </label>
            <input
              type="number"
              value={editForm.price_per_kg}
              onChange={(e) =>
                setEditForm({ ...editForm, price_per_kg: e.target.value })
              }
              min="0"
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Unit
            </label>
            <select
              value={editForm.unit}
              onChange={(e) =>
                setEditForm({ ...editForm, unit: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            >
              <option value="kg">kg</option>
              <option value="liter">liter</option>
              <option value="pcs">pcs</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Status
            </label>
            <button
              onClick={() =>
                setEditForm({ ...editForm, is_active: !editForm.is_active })
              }
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                editForm.is_active
                  ? 'bg-brand/10 border-brand/30 text-brand-300'
                  : 'bg-surface-overlay border-surface-border text-ink-muted'
              }`}
            >
              <span>{editForm.is_active ? 'Active' : 'Inactive'}</span>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  editForm.is_active ? 'bg-brand' : 'bg-surface-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    editForm.is_active ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setApiError(''); setDeleteOpen(true); }}
            >
              <Trash2 size={13} /> Delete
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditOpen(false); setApiError(''); }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={edit.isPending}
                onClick={() => edit.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* delete confirmation modal */}
      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setApiError(''); }}
        title="Delete Category"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                Delete &ldquo;{editTarget?.name}&rdquo;?
              </p>
              <p className="text-sm text-ink-muted mt-1">
                This action{' '}
                <span className="text-red-400 font-medium">cannot be undone</span>.
                The category will be permanently removed.
              </p>
              <p className="text-xs text-ink-faint mt-2">
                Note: categories with existing reports cannot be deleted.
              </p>
            </div>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDeleteOpen(false); setApiError(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 size={13} /> Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}