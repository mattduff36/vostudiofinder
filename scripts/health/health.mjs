#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg?.split('=')[1] || 'quick';
const results = [];

function add(status, category, check, detail) {
  results.push({ status, category, check, detail });
}
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function commandExists(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0;
}
function run(cmd, args, label) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  const output = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
  add(r.status === 0 ? 'PASS' : 'FAIL', 'verification', label, output.slice(-1200) || `exit ${r.status}`);
}

for (const tool of ['node', 'npm', 'git']) {
  add(commandExists(tool) ? 'PASS' : 'FAIL', 'tooling', `tool:${tool}`, commandExists(tool) ? 'available' : 'missing');
}

const required = [
  'AGENTS.md', '.cursorignore',
  '.cursor/rules/governance.mdc', '.cursor/rules/ui-design.mdc',
  '.cursor/rules/backend-api.mdc', '.cursor/rules/data-payments-security.mdc',
  '.cursor/rules/email-system.mdc', '.cursor/rules/testing-release.mdc',
  'docs/PRODUCT_BEHAVIOUR.md', 'docs/ARCHITECTURE.md', 'docs/DESIGN.md',
  'docs/DEVELOPMENT.md', 'docs/ENVIRONMENT.md', 'docs/TESTING.md', 'docs/OPERATIONS.md', 'docs/SECURITY.md'
];
for (const rel of required) add(exists(rel) ? 'PASS' : 'FAIL', 'governance', rel, exists(rel) ? 'present' : 'missing');

if (exists('.cursorrules')) add('WARN', 'governance', 'legacy-.cursorrules', 'Legacy .cursorrules is still active; archive/remove after preserving any unique current rules.');
else add('PASS', 'governance', 'legacy-.cursorrules', 'not active');

let pkg = null;
try {
  pkg = JSON.parse(read('package.json'));
  add('PASS', 'config', 'package-json', `${pkg.name || 'package'} ${pkg.version || ''}`.trim());
} catch (e) { add('FAIL', 'config', 'package-json', String(e)); }

const envUse = new Set();
const codeRoots = ['src', 'scripts'];
const envRx = /process\.env\.([A-Z0-9_]+)/g;
function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, cb); else cb(p);
  }
}
for (const rel of codeRoots) walk(path.join(root, rel), (p) => {
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(p)) return;
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(envRx)) envUse.add(m[1]);
});
if (exists('next.config.ts')) for (const m of read('next.config.ts').matchAll(envRx)) envUse.add(m[1]);
const exampleKeys = new Set();
if (exists('env.example')) {
  for (const line of read('env.example').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=/); if (m) exampleKeys.add(m[1]);
  }
}
const ignoredComputed = new Set(['NODE_ENV','VERCEL_ENV','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_GIT_COMMIT_DATE','GITHUB_RUN_NUMBER','NEXT_RUNTIME','NEXT_PUBLIC_BUILD_VERSION','NEXT_PUBLIC_GIT_COMMIT_DATE','HEALTH_BUILD']);
const missingEnv = [...envUse].filter((k) => !exampleKeys.has(k) && !ignoredComputed.has(k)).sort();
add(missingEnv.length ? 'WARN' : 'PASS', 'config', 'env-contract', missingEnv.length ? `Used but absent from env.example: ${missingEnv.join(', ')}` : 'No obvious missing code-referenced keys');

if (exists('Dockerfile')) {
  const docker = read('Dockerfile');
  const m = docker.match(/FROM\s+node:(\d+)/);
  const dockerMajor = m ? Number(m[1]) : null;
  if (dockerMajor === 24) add('PASS', 'runtime', 'docker-node', 'Node 24 LTS');
  else if (dockerMajor === 25) add('WARN', 'runtime', 'docker-node', 'Dockerfile uses Node 25, which is EOL. Supported baseline is Node 24 LTS.');
  else add('WARN', 'runtime', 'docker-node', dockerMajor ? `Dockerfile uses Node ${dockerMajor}; supported baseline is Node 24 LTS.` : 'No node major detected');
  if (docker.includes('.next/standalone')) {
    const standalone = exists('next.config.ts') && /output\s*:\s*['\"]standalone['\"]/.test(read('next.config.ts'));
    add(standalone ? 'PASS' : 'WARN', 'runtime', 'docker-standalone-contract', standalone ? 'next.config enables standalone' : 'Docker expects .next/standalone but next.config.ts does not visibly enable output: standalone');
  }
}

if (exists('src/middleware.ts') && pkg?.dependencies?.next) add('WARN', 'framework', 'next-proxy-migration', `src/middleware.ts exists with Next ${pkg.dependencies.next}; Next 16 deprecates the middleware filename in favour of proxy.`);
if (exists('.github/workflows/ci.yml.disabled')) add('WARN', 'ci', 'github-ci', 'CI workflow is disabled.');

if (exists('src/lib/db.ts') && /log\s*:\s*\[\s*['\"]query['\"]\s*\]/.test(read('src/lib/db.ts'))) add('WARN', 'operations', 'prisma-query-logging', 'Prisma query logging appears enabled globally. Review production logging intent.');

const riskyTodo = [];
for (const rel of ['src/app/api/stripe','src/app/api/auth','src/app/api/user','src/lib/stripe','src/lib/auth.ts']) {
  const full=path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const files = fs.statSync(full).isDirectory() ? [] : [full];
  if (fs.statSync(full).isDirectory()) walk(full, (p) => { if (/\.(ts|tsx)$/.test(p)) files.push(p); });
  for (const p of files) {
    const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
    lines.forEach((line,i)=>{ if (/\bTODO\b/.test(line)) riskyTodo.push(`${path.relative(root,p)}:${i+1}`); });
  }
}
add(riskyTodo.length ? 'WARN' : 'PASS', 'risk', 'critical-path-todos', riskyTodo.length ? riskyTodo.join(', ') : 'none found');

const large = [];
walk(path.join(root,'src'), (p) => {
  if (!/\.(ts|tsx)$/.test(p)) return;
  const size=fs.statSync(p).size;
  if (size >= 70000) large.push(`${path.relative(root,p)} ${(size/1024).toFixed(1)}KB`);
});
add(large.length ? 'WARN' : 'PASS', 'maintainability', 'large-source-hotspots', large.length ? large.join('; ') : 'none >=70KB');

if (commandExists('git')) {
  const r=spawnSync('git',['ls-files'],{cwd:root,encoding:'utf8'});
  if (r.status===0) {
    const bad=r.stdout.split(/\r?\n/).filter(Boolean).filter((f)=>f !== 'env.example' && !f.endsWith('/env.example')).filter((f)=>/(^|\/)(\.env($|\.)|backups?\/|docs-private\/|scripts-private\/)|\.(dump|pem)$/.test(f));
    add(bad.length ? 'FAIL' : 'PASS','security','tracked-sensitive-paths',bad.length ? bad.slice(0,20).join(', ') : 'no obvious tracked sensitive paths');
    const diff=spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});
    add(diff.status===0 ? 'PASS' : 'FAIL','git','diff-check',(diff.stdout+diff.stderr).trim() || 'clean');
  } else add('WARN','git','repository-state','git metadata unavailable');
}

if (mode === 'full') {
  if (!exists('node_modules')) add('WARN','verification','full-checks','node_modules missing; skipped npm-based full checks');
  else {
    run('npm',['run','type-check'],'type-check');
    run('npm',['run','lint'],'lint');
    run('npx',['jest','tests/unit','--runInBand'],'unit-tests');
    if (process.env.HEALTH_BUILD === '1') run('npm',['run','build'],'build');
    else add('WARN','verification','build','Skipped by default. Set HEALTH_BUILD=1 for a full build when the environment is safe/complete.');
  }
}

const rank={FAIL:2,WARN:1,PASS:0};
const overall=results.reduce((a,r)=>Math.max(a,rank[r.status]),0)===2?'FAIL':results.some(r=>r.status==='WARN')?'WARN':'PASS';
console.log(`# Voiceover Studio Finder codebase health\n\nGenerated: ${new Date().toISOString()}\nMode: ${mode}\nOverall: **${overall}**\n`);
console.log('| Status | Category | Check | Detail |\n|---|---|---|---|');
for (const r of results) console.log(`| ${r.status} | ${r.category} | \`${r.check}\` | ${String(r.detail).replace(/\|/g,'\\|').replace(/\r?\n/g,' ')} |`);
process.exit(results.some((r)=>r.status==='FAIL') ? 1 : 0);
