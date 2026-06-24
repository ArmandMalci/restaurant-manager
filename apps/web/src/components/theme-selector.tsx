import { useTheme, type Theme } from './theme-provider';

const THEMES: { value: Theme; label: string; description: string; swatch: string }[] = [
  {
    value: 'default',
    label: 'Warm canvas',
    description: 'Warm paper & terracotta',
    swatch: '#c2562f',
  },
  { value: 'midnight', label: 'Midnight', description: 'Dark premium tool', swatch: '#6366f1' },
  { value: 'monokai', label: 'Monokai', description: 'Dark editorial', swatch: '#fd971f' },
  { value: 'gruvbox', label: 'Gruvbox', description: 'Warm retro dark', swatch: '#fe8019' },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      {THEMES.map(({ value, label, description, swatch }) => {
        const isActive = theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={[
              'flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
              isActive
                ? 'border-accent bg-accent/10 text-foreground font-medium ring-1 ring-accent'
                : 'border-border bg-card text-foreground hover:bg-muted',
            ].join(' ')}
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-border"
              style={{ background: swatch }}
            />
            <span className="flex flex-col">
              <span>{label}</span>
              <span className="text-xs text-muted-foreground font-normal">{description}</span>
            </span>
            {isActive && (
              <svg
                className="ml-auto h-4 w-4 shrink-0 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
