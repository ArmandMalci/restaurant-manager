import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tailwind from 'eslint-plugin-tailwindcss';

export default [
  // NOTE: eslint-plugin-tailwindcss@3.x uses a legacy ESLint API (context.getSourceCode)
  // that was removed in ESLint 10. The flat/recommended spread is omitted here to prevent
  // crashes. Re-enable once the plugin releases ESLint 10 + Tailwind 4 compatible version.
  // ...tailwind.configs['flat/recommended'],
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
        config: undefined,
      },
    },
    rules: {
      // Tailwind rules disabled — eslint-plugin-tailwindcss@3.x is incompatible with ESLint 10
      // 'tailwindcss/classnames-order': 'warn',
      // 'tailwindcss/no-custom-classname': 'error',
      // 'tailwindcss/no-contradicting-classname': 'error',
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
