/**
 * UrlModal — shared modal chrome on top of `dialog.tsx`: full-screen below the `sm:`
 * breakpoint, centered card at `sm:` and up (per docs/PRODUCT.md's "modal, not drawer" /
 * "full screen like a new page on mobile" rule).
 *
 * Two modes:
 *  - URL-driven: pass `paramKey` (+ optional `paramValue`) and open state is read/written
 *    via the current route's search params — mirrors the existing `/order?tableId=` pattern.
 *    Survives refresh and responds to the back button for free.
 *  - Locally-controlled: omit `paramKey` and pass `open`/`onOpenChange`, same contract as
 *    `Sheet` today.
 */
import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type SearchRecord = Record<string, unknown>;

/**
 * Pure — no router dependency, so it's unit-testable without a Router harness.
 * Adds `paramValue` (default `true`) to `prev` under `paramKey` when opening; removes the
 * key when closing. Every other search param is preserved untouched.
 */
export function computeNextSearch(
  prev: SearchRecord,
  paramKey: string,
  paramValue: string | undefined,
  open: boolean,
): SearchRecord {
  const next = { ...prev };

  if (open) {
    next[paramKey] = paramValue ?? true;
  } else {
    delete next[paramKey];
  }

  return next;
}

function useUrlOpenState(paramKey: string, paramValue: string | undefined) {
  const search = useSearch({ strict: false }) as SearchRecord;
  const navigate = useNavigate();

  const isOpen = Boolean(search[paramKey]);

  const setOpen = React.useCallback(
    (open: boolean) => {
      navigate({
        to: '.',
        search: (prev) => computeNextSearch(prev as SearchRecord, paramKey, paramValue, open),
        replace: false,
      });
    },
    [navigate, paramKey, paramValue],
  );

  return { isOpen, setOpen };
}

export interface UrlModalProps {
  /** Search param key that drives open state. Omit for locally-controlled mode. */
  paramKey?: string;
  /** Value written to the param when opened (defaults to `true`). Ignored without `paramKey`. */
  paramValue?: string;
  /** Locally-controlled mode only — used when `paramKey` is omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const noop = () => {};

export function UrlModal({
  paramKey,
  paramValue,
  open: openProp,
  onOpenChange,
  children,
  className,
  showCloseButton = true,
}: UrlModalProps) {
  // Hooks run unconditionally (rules-of-hooks) — this component only ever renders inside
  // the app's RouterProvider, so useSearch/useNavigate are always safe to call even when
  // the caller ends up using local mode.
  const urlState = useUrlOpenState(paramKey ?? '__url_modal_unused__', paramValue);

  const isOpen = paramKey ? urlState.isOpen : Boolean(openProp);
  const handleOpenChange = paramKey ? urlState.setOpen : (onOpenChange ?? noop);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          'top-0 left-0 flex h-full max-h-full w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none p-0',
          'sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl',
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
