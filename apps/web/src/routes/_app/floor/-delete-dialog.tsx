/**
 * Delete-confirmation dialog for a table — shared by grid view (index.tsx)
 * and map view (-floor-map.tsx) so there's exactly one implementation.
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { X } from 'lucide-react';

function DialogOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function DialogPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card border border-border shadow-lg p-6"
    >
      {children}
    </div>
  );
}

export interface DeleteDialogProps {
  tableNumber: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDialog({ tableNumber, onConfirm, onClose }: DeleteDialogProps) {
  return (
    <>
      <DialogOverlay onClose={onClose} />
      <DialogPanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Delete Table {tableNumber}?</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          This action cannot be undone. Table {tableNumber} will be permanently removed.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </DialogPanel>
    </>
  );
}
