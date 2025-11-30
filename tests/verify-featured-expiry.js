#!/usr/bin/env node

/**
 * Automated verification script for Featured Expiry Date feature
 * 
 * This script checks that the code implementation is correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Featured Expiry Date Implementation...\n');

let passed = 0;
let failed = 0;

// Test 1: Check EditStudioModal.tsx contains the new field
console.log('Test 1: Checking EditStudioModal.tsx...');
try {
  const modalPath = path.join(__dirname, '../src/components/admin/EditStudioModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  
  const checks = [
    { name: 'Featured Expiry Date field exists', test: () => modalContent.includes('Featured Expiry Date') },
    { name: 'Date input type is "date"', test: () => modalContent.includes('type="date"') },
    { name: 'Conditional rendering based on featured status', test: () => modalContent.includes('profile?._meta?.featured === \'1\'') },
    { name: 'handleMetaChange for featured_expires_at', test: () => modalContent.includes('handleMetaChange(\'featured_expires_at\'') },
    { name: 'Helper text exists', test: () => modalContent.includes('When should this studio stop being featured?') },
    { name: 'Empty date handling', test: () => modalContent.includes('Leave empty for no expiry') },
    { name: 'ISO date conversion', test: () => modalContent.includes('.toISOString()') },
  ];
  
  checks.forEach(check => {
    if (check.test()) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      failed++;
    }
  });
  
} catch (error) {
  console.log(`  ❌ Error reading EditStudioModal.tsx: ${error.message}`);
  failed++;
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All automated checks passed!');
  console.log('📝 Manual testing still required - see tests/featured-expiry.test.ts\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the implementation.\n');
  process.exit(1);
}

