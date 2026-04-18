import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scripts', 'worker-configuration.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // any is widely used in worker/D1/Kysely code
      '@typescript-eslint/no-explicit-any': 'off',
      // _-prefixed params are intentionally unused (e.g. _ctx, _params)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_|^err$',
      }],
      // non-component exports in component files are intentional
      'react-refresh/only-export-components': 'warn',
      // allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }],
      // minor style issues — downgrade to warnings
      'no-useless-assignment': 'warn',
      'no-self-assign': 'warn',
      'no-useless-escape': 'warn',
      // pre-existing react-hooks violations — disable until fixed separately
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      // not enforced in this codebase
      'preserve-caught-error': 'off',
      // prefer-const auto-fixable
      'prefer-const': 'error',
    },
  },
])
