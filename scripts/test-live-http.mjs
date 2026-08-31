#!/usr/bin/env node
/**
 * Run live-server HTTP Jest tests against the local Next.js app on port 4000.
 *
 * Default: reuse an already-running server, or exit with a prerequisite message.
 * `--start` / START_LIVE_SERVER=1: start `next dev`, wait until ready, run tests, shut down.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';
const startRequested = process.argv.includes('--start');
const READY_TIMEOUT_MS = 90_000;

async function isReady() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(2500) });
    return response.status > 0;
  } catch {
    return false;
  }
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

function startDevServer() {
  const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  return spawn(process.execPath, [nextBin, 'dev', '-p', '4000'], {
    cwd: root,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (child.exitCode !== null) {
        clearInterval(timer);
        reject(new Error(`Dev server exited before becoming ready (code ${child.exitCode})`));
        return;
      }
      if (await isReady()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - startedAt > READY_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${BASE_URL} after ${READY_TIMEOUT_MS}ms`));
      }
    }, 1000);
  });
}

function runJest() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['jest', 'tests/live', '--runInBand'],
      { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
    );
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  let child = null;
  const alreadyRunning = await isReady();

  if (!alreadyRunning && !startRequested) {
    console.error(
      `Live-server HTTP tests require the Next.js app at ${BASE_URL}.\n` +
        'Start it with `npm run dev` (port 4000), or run `npm run test:live:start`.\n' +
        'Nothing listening on that port is a missing prerequisite, not an application regression.'
    );
    process.exit(2);
  }

  if (!alreadyRunning && startRequested) {
    console.log(`Starting local Next.js dev server for live HTTP tests at ${BASE_URL}`);
    child = startDevServer();
    child.stderr?.on('data', (buf) => process.stderr.write(buf));
    try {
      await waitForReady(child);
    } catch (error) {
      stopChild(child);
      throw error;
    }
  } else {
    console.log(`Using already-running app at ${BASE_URL}`);
  }

  try {
    const code = await runJest();
    process.exit(code);
  } finally {
    stopChild(child);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
