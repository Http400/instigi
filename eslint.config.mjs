import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/src/generated/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '*.config.{js,mjs,cjs,ts}',
      'apps/*/vite.config.ts',
      'packages/*/vite.config.ts',
      'services/*/vitest.config.ts',
      'services/*/prisma.config.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React apps and shared UI package — browser globals + hooks rules
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // auth-service — Node.js globals
  {
    files: ['services/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Storybook story files — render() functions may use hooks (valid Storybook pattern)
  {
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Test files — relax some rules that are noisy in test code
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
