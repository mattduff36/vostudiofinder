import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';

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
      'scripts-private/**',
      'tests/**',
      'prisma/migrations/**',
      'public/legacy-images/**',
      '*.sql',
      'logs/**',
      'Documents/**',
      'tasks/**',
      '*.md',
      'check-overrides.js',
      'inspect-styles.js',
    ],
  },

  // Default rules for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'sonarjs': sonarjs,
    },
    rules: {
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-var': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'warn',
    },
  },

  // Allow console.log in server-side files (API routes, lib, server utilities)
  {
    files: [
      'src/app/api/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/app/**/layout.tsx',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
