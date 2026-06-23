import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  useStaffControllerGetAll,
  useStaffControllerCreate,
  useStaffControllerUpdate,
  useStaffControllerRemove,
  useStaffControllerSetActive,
  invalidateStaffControllerGetAll,
} from '@/api/staff/staff';
import type { Staff, StaffRole } from '@restaurant/shared';
import type { StaffDto } from '@/api/restaurantManagerAPI.schemas';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_app/staff/')({
  component: StaffPage,
});

const ROLES: StaffRole[] = ['manager', 'waiter', 'kitchen', 'host'];

const ROLE_CLASSES: Record<StaffRole, string> = {
  manager: 'bg-accent/10 text-accent',
  waiter: 'bg-secondary text-secondary-foreground',
  kitchen: 'bg-info/10 text-info',
  host: 'bg-primary/10 text-primary',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Staff form ────────────────────────────────────────────────────────

function StaffForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Staff> | Partial<StaffDto>;
  onSave: (data: {
    name: string;
    email: string;
    role: StaffRole;
    active: boolean;
    password?: string;
  }) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<StaffRole>((initial?.role as StaffRole) ?? 'waiter');
  const [active, setActive] = useState(initial?.active ?? true);
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data: {
          name: string;
          email: string;
          role: StaffRole;
          active: boolean;
          password?: string;
        } = { name, email, role, active };

        if (password) data.password = password;
        onSave(data);
      }}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-medium">
          Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-medium">
          Email *
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Role *
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {isEdit ? 'New password' : 'Password *'}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEdit}
            minLength={8}
            placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
            className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm font-medium">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Staff card ────────────────────────────────────────────────────────

function StaffCard({
  s,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  s: Staff | StaffDto;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow',
        !s.active && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-sm shrink-0">
            {getInitials(s.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-card-foreground truncate">{s.name}</p>
            <p className="text-muted-foreground text-sm truncate">{s.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleActive}
            aria-label={s.active ? 'Deactivate' : 'Activate'}
            className="hover:bg-muted rounded p-1 transition-colors"
          >
            {s.active ? (
              <UserX className="text-muted-foreground h-4 w-4" />
            ) : (
              <UserCheck className="text-primary h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="hover:bg-muted rounded p-1 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="text-destructive hover:bg-muted rounded p-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            ROLE_CLASSES[s.role as StaffRole],
          )}
        >
          {s.role}
        </span>
        {!s.active && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function StaffPage() {
  const [roleFilter, setRoleFilter] = useState<StaffRole | undefined>();
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none');

  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useStaffControllerGetAll(
    roleFilter ? { role: roleFilter } : undefined,
  );
  const createStaff = useStaffControllerCreate({
    mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
  });
  const updateStaff = useStaffControllerUpdate({
    mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
  });
  const deleteStaff = useStaffControllerRemove({
    mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
  });
  const setActive = useStaffControllerSetActive({
    mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
  });

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {staff.length} member{staff.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setFormMode('create')}>
          <Plus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Role filters */}
      <div className="flex flex-wrap gap-2">
        {([undefined, ...ROLES] as const).map((r) => (
          <button
            type="button"
            key={String(r)}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors',
              roleFilter === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted',
            )}
          >
            {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {formMode === 'create' && (
        <StaffForm
          onSave={(data) =>
            createStaff.mutate({ data: data as never }, { onSuccess: () => setFormMode('none') })
          }
          onCancel={() => setFormMode('none')}
        />
      )}

      {/* Staff grid */}
      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title={roleFilter ? `No staff with role "${roleFilter}"` : 'No staff yet'}
          description={
            roleFilter
              ? 'Try a different role filter.'
              : 'Add your first staff member to get started.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) =>
            typeof formMode === 'object' && formMode.id === s.id ? (
              <div key={s.id} className="sm:col-span-2 lg:col-span-3">
                <StaffForm
                  initial={s}
                  onSave={(data) =>
                    updateStaff.mutate(
                      { id: s.id, data: data as never },
                      { onSuccess: () => setFormMode('none') },
                    )
                  }
                  onCancel={() => setFormMode('none')}
                />
              </div>
            ) : (
              <StaffCard
                key={s.id}
                s={s}
                onEdit={() => setFormMode({ id: s.id })}
                onToggleActive={() =>
                  setActive.mutate({ id: s.id, data: { active: !s.active } as never })
                }
                onDelete={() =>
                  window.confirm(`Delete ${s.name}?`) && deleteStaff.mutate({ id: s.id })
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
