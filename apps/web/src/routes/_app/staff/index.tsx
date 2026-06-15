import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
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

export const Route = createFileRoute('/_app/staff/')({
  component: StaffPage,
});

const ROLES: StaffRole[] = ['manager', 'waiter', 'kitchen', 'host'];
const ROLE_CLASSES: Record<StaffRole, string> = {
  manager: 'bg-purple-100 text-purple-800',
  waiter: 'bg-blue-100 text-blue-800',
  kitchen: 'bg-orange-100 text-orange-800',
  host: 'bg-teal-100 text-teal-800',
};

// ── Staff form ────────────────────────────────────────────────────────

function StaffForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Staff>;
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
  const [role, setRole] = useState<StaffRole>(initial?.role ?? 'waiter');
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
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
          Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
          Email *
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Role *
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {isEdit ? 'New password' : 'Password *'}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEdit}
            minLength={8}
            placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {staff.length} member{staff.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode('create')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add staff
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([undefined, ...ROLES] as const).map((r) => (
          <button
            type="button"
            key={String(r)}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              roleFilter === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent',
            )}
          >
            {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {formMode === 'create' && (
        <StaffForm
          onSave={(data) =>
            createStaff.mutate({ data: data as never }, { onSuccess: () => setFormMode('none') })
          }
          onCancel={() => setFormMode('none')}
        />
      )}

      {staff.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No staff{roleFilter ? ` with role "${roleFilter}"` : ''}.
        </p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className={cn('rounded-lg border p-4', !s.active && 'opacity-60')}>
              {typeof formMode === 'object' && formMode.id === s.id ? (
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
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          ROLE_CLASSES[s.role],
                        )}
                      >
                        {s.role}
                      </span>
                      {!s.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setActive.mutate({ id: s.id, data: { active: !s.active } as never })
                      }
                      aria-label={s.active ? 'Deactivate' : 'Activate'}
                      className="hover:bg-accent rounded p-1 transition-colors"
                    >
                      {s.active ? (
                        <UserX className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode({ id: s.id })}
                      aria-label="Edit"
                      className="hover:bg-accent rounded p-1 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        window.confirm(`Delete ${s.name}?`) && deleteStaff.mutate({ id: s.id })
                      }
                      aria-label="Delete"
                      className="text-destructive hover:bg-accent rounded p-1 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
