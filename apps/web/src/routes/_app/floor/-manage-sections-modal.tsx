/**
 * ManageSectionsModal — create/rename/reorder/delete sections, opened from the small
 * "Manage sections" gear icon next to the floor screen's section tabs (see Plan 17 Task 2).
 *
 * Delete is disabled (with a `title` tooltip) when the section still has tables — no
 * cascade, matching the design's "move or delete its tables first" guard.
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useSectionControllerCreate,
  useSectionControllerUpdate,
  useSectionControllerRemove,
  invalidateSectionControllerGetAll,
} from '@/api/sections/sections';
import type { SectionDto } from '@/api/restaurantManagerAPI.schemas';

export interface ManageSectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sorted by sortOrder ascending. */
  sections: SectionDto[];
  tableCountBySection: Map<string, number>;
}

export function ManageSectionsModal({
  open,
  onOpenChange,
  sections,
  tableCountBySection,
}: ManageSectionsModalProps) {
  const qc = useQueryClient();
  const createSection = useSectionControllerCreate();
  const updateSection = useSectionControllerUpdate();
  const removeSection = useSectionControllerRemove();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();

    if (!name) return;
    createSection.mutate(
      { data: { name, sortOrder: sections.length } },
      { onSuccess: () => invalidateSectionControllerGetAll(qc).then(() => setNewName('')) },
    );
  }

  function handleSaveRename(id: string) {
    const name = editingName.trim();

    if (!name) return;
    updateSection.mutate(
      { id, data: { name } },
      { onSuccess: () => invalidateSectionControllerGetAll(qc).then(() => setEditingId(null)) },
    );
  }

  function handleMove(section: SectionDto, direction: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swapWith = sections[idx + direction];

    if (!swapWith) return;
    updateSection.mutate({ id: section.id, data: { sortOrder: swapWith.sortOrder } });
    updateSection.mutate(
      { id: swapWith.id, data: { sortOrder: section.sortOrder } },
      { onSuccess: () => invalidateSectionControllerGetAll(qc) },
    );
  }

  function handleDelete(section: SectionDto) {
    removeSection.mutate(
      { id: section.id },
      { onSuccess: () => invalidateSectionControllerGetAll(qc) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage sections</DialogTitle>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {sections.map((section, idx) => {
            const tableCount = tableCountBySection.get(section.id) ?? 0;
            const isEditing = editingId === section.id;

            return (
              <div
                key={section.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(section, -1)}
                    aria-label={`Move ${section.name} up`}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => handleMove(section, 1)}
                    aria-label={`Move ${section.name} down`}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(section.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <span className="flex-1 text-sm text-foreground">{section.name}</span>
                )}

                <span className="text-xs text-muted-foreground">
                  {tableCount} table{tableCount !== 1 ? 's' : ''}
                </span>

                {isEditing ? (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleSaveRename(section.id)}
                    aria-label="Save name"
                  >
                    <Check />
                  </Button>
                ) : (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(section.id);
                      setEditingName(section.name);
                    }}
                    aria-label={`Rename ${section.name}`}
                  >
                    <Pencil />
                  </Button>
                )}

                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDelete(section)}
                  disabled={tableCount > 0}
                  title={tableCount > 0 ? 'Move or delete its tables first' : 'Delete section'}
                  aria-label={`Delete ${section.name}`}
                  className="hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}

          {sections.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No sections yet.</p>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 border-t border-border pt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New section name"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={!newName.trim() || createSection.isPending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
