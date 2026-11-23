import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      // Express error handlers need all four parameters even when `next` is unused.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
    }
  }
];