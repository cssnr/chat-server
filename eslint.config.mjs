import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
// import globals from 'globals'

// noinspection JSCheckFunctionSignatures,JSUnresolvedReference
export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // 'no-undef': 'off',
    },
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        parser: tseslint.parser,
      },
      // globals: {
      //   ...globals.browser,
      // },
    },
  },
])
