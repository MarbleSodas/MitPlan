import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },
  // Base config for JS/JSX (browser)
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Node scripts and tooling
  {
    files: ['scripts/**/*.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
    },
    rules: {
      // Keep base recommendations
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Vitest tests (unit/integration)
  {
    files: [
      '**/*.test.{js,jsx}',
      'src/tests/**/*.{js,jsx}',
      'src/**/__tests__/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
        // Some legacy tests reference jest globals
        ...globals.jest,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off', // test runners provide globals
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]
