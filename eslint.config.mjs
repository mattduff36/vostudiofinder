import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'next-env.d.ts',
      '*.config.js',
      '*.config.mjs',
      'scripts/**',
      'prisma/migrations/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
            rules: {
          // General code quality (relaxed for deployment)
          'no-console': 'warn',
          'prefer-const': 'warn',
          'no-var': 'error',
          'object-shorthand': 'warn',
          'prefer-template': 'warn',
          '@typescript-eslint/no-explicit-any': 'warn',
          '@typescript-eslint/no-unused-vars': 'warn',
          '@typescript-eslint/no-require-imports': 'warn',
          'react/no-unescaped-entities': 'warn',
          '@next/next/no-img-element': 'warn',
          '@next/next/no-html-link-for-pages': 'warn',
          'jsx-a11y/alt-text': 'warn',
          'react-hooks/exhaustive-deps': 'warn',
        },
  },
];

export default eslintConfig;