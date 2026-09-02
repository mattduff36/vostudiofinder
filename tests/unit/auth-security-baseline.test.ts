/**
 * Lockfile regression for the Auth.js v4 security floor.
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseSemverCore(input: string | undefined | null) {
  if (input == null) return null;
  const match = String(input).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function semverGte(
  a: { major: number; minor: number; patch: number } | null,
  b: { major: number; minor: number; patch: number }
) {
  if (!a) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

const AUTH_V4_MIN = { major: 4, minor: 24, patch: 15 };

describe('Auth.js security baseline', () => {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'));

  it('keeps next-auth on a patched v4 release and a single patched @auth/core', () => {
    const declared = parseSemverCore(pkg.dependencies['next-auth']);
    const resolved = parseSemverCore(lock.packages?.['node_modules/next-auth']?.version);
    const adapter = lock.packages?.['node_modules/@auth/prisma-adapter']?.version;
    const coreEntries = Object.entries(lock.packages || {}).filter(([key]) =>
      /(^|\/)node_modules\/@auth\/core$/.test(key)
    );

    expect(pkg.dependencies['@auth/core']).toBeUndefined();
    expect(declared?.major).toBe(4);
    expect(semverGte(declared, AUTH_V4_MIN)).toBe(true);
    expect(resolved).toEqual({ major: 4, minor: 24, patch: 15 });
    expect(adapter).toBe('2.11.3');
    expect(coreEntries).toHaveLength(1);
    expect(coreEntries[0][1]).toMatchObject({ version: '0.41.3' });
    expect(pkg.dependencies.next).toMatch(/16\.3\.3/);
    expect(lock.packages?.['node_modules/next']?.version).toBe('16.3.3');
  });
});
