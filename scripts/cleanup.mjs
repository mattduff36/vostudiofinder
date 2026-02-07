/**
 * Cleanup / Audit Script
 * Runs: type-check → eslint → oxlint → depcheck
 * All stages run even if earlier ones have warnings.
 * Usage: npm run cleanup
 */

import { execSync } from 'child_process';

const stages = [
  { name: 'TypeScript type-check', cmd: 'npx tsc --noEmit' },
  { name: 'ESLint',                cmd: 'npx eslint .' },
  { name: 'oxlint (fast lint)',    cmd: 'npx oxlint .' },
  { name: 'depcheck',             cmd: 'npx depcheck' },
];

console.log('\n══════════════════════════════════════════════════════');
console.log('  PROJECT CLEANUP / AUDIT');
console.log('══════════════════════════════════════════════════════\n');

const results = [];

for (const stage of stages) {
  console.log(`\n── ${stage.name} ─────────────────────────────────\n`);
  try {
    const output = execSync(stage.cmd, { stdio: 'inherit', encoding: 'utf-8' });
    results.push({ name: stage.name, status: 'PASS', issues: 0 });
  } catch (err) {
    // Non-zero exit means warnings/errors were found — that's expected
    results.push({ name: stage.name, status: 'ISSUES', issues: err.status || 1 });
  }
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('══════════════════════════════════════════════════════\n');

for (const r of results) {
  const icon = r.status === 'PASS' ? '  PASS' : '  WARN';
  console.log(`  ${icon}  ${r.name}`);
}

console.log('\n── CLEANUP COMPLETE ──\n');
