import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  { ignores: ['dist/**', '**/dist/**', '**/node_modules/**', '**/generated/**', 'review/**', 'fonts/**', 'playwright-report/**', 'test-results/**', '.agent/**', '.local/**', '.backups/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.{js,mjs,ts,tsx}'], languageOptions: { globals: { ...globals.browser, ...globals.node } }, rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['src/**', 'scripts/*.{js,mjs,ts}', 'vite.config.ts', 'tailwind.config.ts'], rules: { '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off' } }
);
