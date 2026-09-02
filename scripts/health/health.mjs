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

/** August 2026 Next.js Active-LTS security floor. Bump when a later required secure release ships. */
const NEXT_MIN_SECURE = { major: 16, minor: 3, patch: 3 };

function parseSemverCore(input) {
  if (input == null) return null;
  const m = String(input).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function semverGte(a, b) {
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function formatSemver(v) {
  return v ? `${v.major}.${v.minor}.${v.patch}` : 'unknown';
}

function isPrereleaseSpec(input) {
  return /-(?:canary|alpha|beta|rc|preview)\b/i.test(String(input || ''));
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
const ignoredComputed = new Set(['NODE_ENV','VERCEL','VERCEL_ENV','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_GIT_COMMIT_DATE','GITHUB_RUN_NUMBER','NEXT_RUNTIME','NEXT_PUBLIC_BUILD_VERSION','NEXT_PUBLIC_GIT_COMMIT_DATE','HEALTH_BUILD']);
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
    if (!exists('next.config.ts')) {
      add('FAIL', 'runtime', 'docker-standalone-contract', 'Docker expects .next/standalone but next.config.ts is missing');
    } else {
      const cfg = read('next.config.ts');
      const vercelConditionalTernary = /output\s*:\s*process\.env\.VERCEL\s*\?\s*undefined\s*:\s*['"]standalone['"]/.test(cfg);
      const vercelConditionalGuard = /if\s*\(\s*!process\.env\.VERCEL\s*\)[\s\S]{0,120}output\s*=\s*['"]standalone['"]/.test(cfg);
      const vercelConditional = vercelConditionalTernary || vercelConditionalGuard;
      const unconditionalStandalone = /^\s*output\s*:\s*['"]standalone['"]\s*,?\s*$/m.test(cfg);
      const mentionsStandalone = /['"]standalone['"]/.test(cfg);
      if (vercelConditional && !unconditionalStandalone) {
        add('PASS', 'runtime', 'docker-standalone-contract', 'Standalone output is Vercel-conditional: disabled on Vercel, enabled for local/Docker');
      } else if (unconditionalStandalone) {
        add('FAIL', 'runtime', 'docker-standalone-contract', 'output: standalone is unconditional. Next.js 16.3 + the Vercel adapter fails looking for .next/next-server.js.nft.json. Enable standalone only when VERCEL is unset.');
      } else if (!mentionsStandalone) {
        add('FAIL', 'runtime', 'docker-standalone-contract', 'Docker expects .next/standalone but next.config.ts no longer enables standalone for non-Vercel builds');
      } else {
        add('WARN', 'runtime', 'docker-standalone-contract', 'Standalone output is present but not in the expected Vercel-conditional form (assign output: "standalone" only when VERCEL is unset)');
      }
    }
  }
}

{
  const declaredSpec = pkg?.dependencies?.next;
  let lockVersion = null;
  if (exists('package-lock.json')) {
    try {
      lockVersion = JSON.parse(read('package-lock.json')).packages?.['node_modules/next']?.version || null;
    } catch {
      lockVersion = null;
    }
  }
  const declared = parseSemverCore(declaredSpec);
  const resolved = parseSemverCore(lockVersion);
  const declaredOk = semverGte(declared, NEXT_MIN_SECURE);
  const resolvedOk = lockVersion ? semverGte(resolved, NEXT_MIN_SECURE) : declaredOk;
  const prerelease = isPrereleaseSpec(declaredSpec) || isPrereleaseSpec(lockVersion);
  const minLabel = formatSemver(NEXT_MIN_SECURE);
  const detail = `declared ${declaredSpec || 'missing'} (core ${formatSemver(declared)}); lockfile ${lockVersion || 'unknown'}; minimum secure baseline ${minLabel} (Next.js August 2026 Active LTS: GHSA-2xp9-vwfh-vxw4, CVE-2026-75604 / GHSA-p293-qw3h-jr36)`;
  if (prerelease) {
    add('FAIL', 'framework', 'next-security-baseline', `Next.js prerelease is not an allowed security baseline. ${detail}`);
  } else if (!declaredOk || !resolvedOk) {
    add('FAIL', 'framework', 'next-security-baseline', `Next.js is below the required secure release ${minLabel}. ${detail}`);
  } else {
    add('PASS', 'framework', 'next-security-baseline', detail);
  }
}

/** July 2026 Auth.js / NextAuth v4 security floor. Major >=5 is a future deliberate migration. */
const AUTH_MIN_SECURE = { major: 4, minor: 24, patch: 15 };
const AUTH_CORE_MIN_SECURE = { major: 0, minor: 41, patch: 3 };

function isLockPackageKey(key, name) {
  return key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`);
}

function lockPackageEntries(lock, name) {
  const packages = lock?.packages || {};
  const found = [];
  for (const [key, meta] of Object.entries(packages)) {
    if (isLockPackageKey(key, name) && meta && typeof meta === 'object') {
      found.push({ key, version: meta.version || null });
    }
  }
  return found;
}

function isExactFloorPrerelease(spec, floor) {
  const parsed = parseSemverCore(spec);
  if (!parsed || !isPrereleaseSpec(spec)) return false;
  return parsed.major === floor.major && parsed.minor === floor.minor && parsed.patch === floor.patch;
}

function versionMeetsSecurityFloor(spec, floor) {
  const parsed = parseSemverCore(spec);
  if (!parsed) return false;
  if (isExactFloorPrerelease(spec, floor)) return false;
  if (parsed.major >= 5) return true;
  return semverGte(parsed, floor);
}

{
  const declaredSpec = pkg?.dependencies?.['next-auth'];
  let lock = null;
  if (exists('package-lock.json')) {
    try { lock = JSON.parse(read('package-lock.json')); } catch { lock = null; }
  }
  const nextAuthEntries = lock ? lockPackageEntries(lock, 'next-auth') : [];
  const coreEntries = lock ? lockPackageEntries(lock, '@auth/core') : [];
  const declared = parseSemverCore(declaredSpec);
  const declaredOk = versionMeetsSecurityFloor(declaredSpec, AUTH_MIN_SECURE);
  const nextAuthResolvedOk = nextAuthEntries.length
    ? nextAuthEntries.every((entry) => versionMeetsSecurityFloor(entry.version, AUTH_MIN_SECURE))
    : declaredOk;
  const coreOk = coreEntries.every((entry) => versionMeetsSecurityFloor(entry.version, AUTH_CORE_MIN_SECURE));
  const nextAuthLabel = formatSemver(AUTH_MIN_SECURE);
  const coreLabel = formatSemver(AUTH_CORE_MIN_SECURE);
  const nextAuthResolved = nextAuthEntries.map((entry) => `${entry.key}@${entry.version || 'unknown'}`).join(', ') || 'none';
  const coreResolved = coreEntries.map((entry) => `${entry.key}@${entry.version || 'unknown'}`).join(', ') || 'none';
  const detail = `declared ${declaredSpec || 'missing'} (core ${formatSemver(declared)}); lockfile next-auth ${nextAuthResolved}; lockfile @auth/core ${coreResolved}; next-auth floor ${nextAuthLabel} (GHSA-7rqj-j65f-68wh, GHSA-xmf8-cvqr-rfgj, GHSA-x445-f3h2-j279); @auth/core floor ${coreLabel} when present`;

  if (!declaredSpec) {
    add('FAIL', 'framework', 'authjs-security-baseline', `next-auth is not declared. ${detail}`);
  } else if (!declaredOk || !nextAuthResolvedOk) {
    add('FAIL', 'framework', 'authjs-security-baseline', `next-auth is below the required secure release ${nextAuthLabel}, or a prerelease of that exact floor was used. ${detail}`);
  } else if (coreEntries.length && !coreOk) {
    add('FAIL', 'framework', 'authjs-security-baseline', `@auth/core copy is below ${coreLabel}, or a prerelease of that exact floor was used. ${detail}`);
  } else {
    add('PASS', 'framework', 'authjs-security-baseline', detail);
  }
}

{
  const hasProxy = exists('src/proxy.ts');
  const hasMiddleware = exists('src/middleware.ts');
  if (hasProxy && !hasMiddleware) {
    add('PASS', 'framework', 'next-proxy-migration', 'src/proxy.ts is the canonical Next.js request-boundary file; deprecated src/middleware.ts is absent.');
  } else if (hasProxy && hasMiddleware) {
    add('FAIL', 'framework', 'next-proxy-migration', 'Both src/proxy.ts and deprecated src/middleware.ts exist. Keep only src/proxy.ts.');
  } else if (hasMiddleware) {
    add('FAIL', 'framework', 'next-proxy-migration', 'src/middleware.ts exists without src/proxy.ts. Next.js 16 requires the proxy.ts convention.');
  } else {
    add('FAIL', 'framework', 'next-proxy-migration', 'Neither src/proxy.ts nor src/middleware.ts exists. Expected src/proxy.ts for URL/query sanitisation.');
  }
}
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
