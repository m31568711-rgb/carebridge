import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        document: 'readonly', window: 'readonly', navigator: 'readonly', location: 'readonly',
        localStorage: 'readonly', crypto: 'readonly', File: 'readonly', FormData: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', Headers: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', Blob: 'readonly', Image: 'readonly',
        HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLAnchorElement: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', fetch: 'readonly', crypto: 'readonly', Blob: 'readonly', Buffer: 'readonly', console: 'readonly', URL: 'readonly' } },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly' } },
  },
  globalIgnores(['dist/**', '.next/**', '.vinext/**', '.wrangler/**', 'node_modules/**']),
]);

export default eslintConfig;
