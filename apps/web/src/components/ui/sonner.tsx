import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// ponytail: this app themes via `data-theme` (default/monokai/gruvbox), not next-themes'
// light/dark toggle — CSS vars below do the recoloring, so we skip the next-themes dependency
// entirely rather than adding it just to read a theme name sonner doesn't need.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
