import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import nextPlugin from '@next/eslint-plugin-next'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/.next/',
      '**/.next.stale-*/',
      '**/dist/',
      '**/.kilo/',
      'cotizacion/**',
      'infra/scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/first': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        ...globals.vitest,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'import/first': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
)