import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tailwind from 'eslint-plugin-tailwindcss';

// biome-ignore lint/style/noDefaultExport: ESLint flat config requires default export
export default [
  ...tailwind.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@stylistic': stylistic,
      tailwindcss: tailwind,
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'cva', 'cx'],
        cssFiles: ['src/index.css', 'src/**/*.css'],
      },
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      // no-custom-classname has false positives with Tailwind v4 CSS-variable-based themes
      // (bg-primary, text-muted-foreground etc. are defined via @theme in index.css)
      'tailwindcss/no-custom-classname': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
    },
  },
];
