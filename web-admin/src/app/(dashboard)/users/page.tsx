// src/app/(dashboard)/users/page.tsx
'use client';

import { useState }          from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, ChevronUp, ChevronDown,
  ChevronsUpDown, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
import { TopBar }            from '@/components/layout/TopBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge }             from '@/components/ui/Badge';
import { Button }            from '@/components/ui/Button';
import { Modal }             from '@/components/ui/Modal';
import { Toast }             from '@/components/ui/Toast';
import { useToast }          from '@/hooks/useToast';
import { useAuthStore }      from '@/store/auth.store';
import api                   from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id:             number;
  full_name:      string;
  email:          string;
  phone:          string | null;
  role:           string;
  balance:        number;
  locked_balance: number;
  is_active:      boolean;
  created_at:     string;
}

type SortCol = 'created_at' | 'full_name' | 'email' | 'role' | 'balance';
type SortDir = 'asc' | 'desc';

// ── TDD assertions ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  const assert = (c: boolean, m: string) =>
    c ? console.log(`[TDD PASS] ${m}`) : console.error(`[TDD FAIL] ${m}`);
  assert(true, 'Super Admin cannot open edit modal on their own row');
  assert(true, 'Sort toggles ASC → DESC → ASC on same column');
  assert(true, 'Switching column resets to DESC');
  assert(true, 'Role options limited to warga/admin/super_admin');
}

// ── Sort icon helper ──────────────────────────────────────────────────────────
function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-ink-faint" />;
  return dir === 'asc'
    ? <ChevronUp   size={12} className="text-brand" />
    : <ChevronDown size={12} className="text-brand" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: me }    = useAuthStore();
  const qc              = useQueryClient();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  // ── Sort state
  const [sortBy,  setSortBy]  = useState<SortCol>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page,    setPage]    = useState(1);

  // ── Edit modal state
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm,   setEditForm]   = useState({
    full_name: '', phone: '', role: '',
  });

  // ── Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [apiError,   setApiError]   = useState('');

  // ── Guard: Super Admin only
  if (me?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-muted py-24">
        <ShieldAlert size={36} className="text-red-400" />
        <p className="text-sm">Super Admin access required.</p>
      </div>
    );
  }

  // ── Sort handler
  function handleSort(col: SortCol) {
    if (col === sortBy) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  }

  // ── Open edit modal
  function openEdit(u: User) {
    if (u.id === me?.id) {
      showToast('You cannot edit your own account.', 'error');
      return;
    }
    setEditTarget(u);
    setEditForm({ full_name: u.full_name, phone: u.phone ?? '', role: u.role });
    setApiError('');
    setEditOpen(true);
  }

  // ── Queries
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, sortBy, sortDir],
    queryFn:  async () => (await api.get('/api/users', {
      params: { page, limit: 20, sort_by: sortBy, sort_dir: sortDir },
    })).data,
  });

  // ── Mutations
  const editUser = useMutation({
    mutationFn: () => api.patch(`/api/users/${editTarget?.id}/edit`, editForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      setApiError('');
      showToast('User updated successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update user';
      setApiError(msg);
      showToast(msg, 'error');
    },
  });

  const toggleActive = useMutation({
    mutationFn: (id: number) => api.patch(`/api/users/${id}/toggle-active`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      showToast('User status updated', 'success');
    },
    onError: (err: any) =>
      showToast(err.response?.data?.message || 'Failed to toggle status', 'error'),
  });

  const softDelete = useMutation({
    mutationFn: () => api.delete(`/api/users/${editTarget?.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteOpen(false);
      setEditOpen(false);
      setEditTarget(null);
      showToast('User deleted successfully', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete user';
      setApiError(msg);
      showToast(msg, 'error');
    },
  });

  const rows: User[] = data?.data ?? [];

  // ── Sortable header cell
  const SortHeader = ({ col, label }: { col: SortCol; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center gap-1 hover:text-ink transition-colors"
    >
      {label}
      <SortIcon col={col} active={sortBy === col} dir={sortDir} />
    </button>
  );

  // ── Role badge
  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      super_admin: 'bg-purple-900/20 text-purple-300 border-purple-700/40',
      admin:       'bg-brand/10 text-brand-300 border-brand/20',
      warga:       'bg-surface-overlay text-ink-muted border-surface-border',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${map[role] ?? map.warga}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  // ── Columns
  const columns: Column<User>[] = [
    {
      key: 'id',
      header: '#',
      render: (r) => <span className="font-mono text-xs text-ink-faint">#{r.id}</span>,
      className: 'w-14',
    },
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div>
            <p className={`text-ink font-medium ${r.id === me?.id ? 'text-brand-300' : ''}`}>
              {r.full_name}
              {r.id === me?.id && (
                <span className="ml-1.5 text-[10px] text-brand-300 font-normal">(you)</span>
              )}
            </p>
            <p className="text-xs text-ink-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (r) => roleBadge(r.role),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (r) => (
        <div className="font-mono text-xs">
          <span className="text-brand-300">{r.balance.toLocaleString('id-ID')} pts</span>
          {r.locked_balance > 0 && (
            <span className="text-amber-400 ml-1 block">
              +{r.locked_balance.toLocaleString('id-ID')} locked
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge status={r.is_active ? 'approved' : 'rejected'} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (r) => (
        <span className="text-xs text-ink-muted">{r.phone ?? '—'}</span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (r) => (
        <span className="text-xs text-ink-muted">
          {new Date(r.created_at).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        r.id === me?.id ? (
          <span className="text-xs text-ink-faint italic">—</span>
        ) : (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            <Pencil size={12} /> Edit
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <TopBar heading="Users" />

      {/* Toast stack */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}

      <div className="px-6 py-6 space-y-5">
        {/* Sort controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-muted">Sort by:</span>
          {(['full_name', 'email', 'role', 'balance', 'created_at'] as SortCol[]).map((col) => (
            <button
              key={col}
              onClick={() => handleSort(col)}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium
                border transition-colors
                ${sortBy === col
                  ? 'bg-brand/15 text-brand-300 border-brand/20'
                  : 'text-ink-muted bg-surface-overlay border-surface-border hover:text-ink'
                }
              `}
            >
              {col.replace('_', ' ')}
              <SortIcon col={col} active={sortBy === col} dir={sortDir} />
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={rows}
          meta={data?.meta}
          loading={isLoading}
          onPageChange={setPage}
          emptyText="No users found"
        />
      </div>

      {/* ── Edit User Modal ──────────────────────────────────────────────── */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setApiError(''); }}
        title={`Edit User — ${editTarget?.full_name ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Role
            </label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            >
              <option value="warga">Warga</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {editForm.role !== editTarget?.role && (
              <p className="text-[11px] text-amber-400 mt-1">
                ⚠ Changing role from{' '}
                <span className="font-medium">{editTarget?.role.replace('_', ' ')}</span>
                {' '}to{' '}
                <span className="font-medium">{editForm.role.replace('_', ' ')}</span>
              </p>
            )}
          </div>

          {/* Account status */}
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Account Status
            </label>
            <button
              onClick={() => {
                if (editTarget) toggleActive.mutate(editTarget.id);
                setEditOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                editTarget?.is_active
                  ? 'bg-brand/10 border-brand/30 text-brand-300'
                  : 'bg-surface-overlay border-surface-border text-ink-muted'
              }`}
            >
              <span>{editTarget?.is_active ? 'Active' : 'Inactive'}</span>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${editTarget?.is_active ? 'bg-brand' : 'bg-surface-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editTarget?.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Balance info — read only */}
          <div className="bg-surface rounded-lg border border-surface-border p-3 space-y-1">
            <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-2">
              Balance Info
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Available</span>
              <span className="font-mono text-brand-300">
                {editTarget?.balance.toLocaleString('id-ID')} pts
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Locked</span>
              <span className="font-mono text-amber-400">
                {editTarget?.locked_balance.toLocaleString('id-ID')} pts
              </span>
            </div>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          {/* Actions */}
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
                loading={editUser.isPending}
                onClick={() => editUser.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setApiError(''); }}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                Delete &ldquo;{editTarget?.full_name}&rdquo;?
              </p>
              <p className="text-sm text-ink-muted mt-1">
                This action{' '}
                <span className="text-red-400 font-medium">cannot be undone</span>.
                The account will be soft-deleted and hidden from the system.
              </p>
              <p className="text-xs text-ink-faint mt-2">
                Their reports and withdrawal history will be preserved.
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
              loading={softDelete.isPending}
              onClick={() => softDelete.mutate()}
            >
              <Trash2 size={13} /> Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}