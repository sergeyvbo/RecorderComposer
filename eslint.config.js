import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const uiLayers = ['@/ui/*', '@/audio/*', '@/persistence/*'];

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.specify/',
      '.claude/',
      '*.min.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/ui/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': { include: ['title', 'aria-label', 'placeholder', 'alt'] },
          // Symbols (↶, ▶, ♭ …) live in src/ui/symbols.ts; a custom `words` list disables
          // reporting in eslint-plugin-i18next 6.1 when combined with `jsx-attributes`.
        },
      ],
    },
  },
  {
    files: ['tests/**', 'scripts/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // Principle III: the domain layer is framework-independent.
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', 'tone', 'idb', 'zustand'],
          patterns: [...uiLayers, '@/state/*'],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB'],
    },
  },
  {
    // Layering from plan.md: state depends only on domain.
    files: ['src/state/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: ['tone', 'idb'], patterns: uiLayers }],
    },
  },
);
