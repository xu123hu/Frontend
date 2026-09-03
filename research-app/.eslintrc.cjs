module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.ts',
    '*.config.js',
    'artifacts',
    // 生成/ vendored 产物不参与 lint：Playwright HTML 报告压缩资源、MSW 生成的
    // Service Worker、openapi-typescript 生成类型（以 .gen.ts 结尾）。
    'playwright-report',
    'test-results',
    'public/mockServiceWorker.js',
    '**/*.gen.ts',
  ],
};
