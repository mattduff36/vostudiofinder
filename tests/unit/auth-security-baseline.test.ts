/**
 * Lockfile regression for the Auth.js v4 security floor.
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseSemverCore,
  semverGte,
  isPrereleaseSpec,
  versionMeetsSecurityFloor,
} from '../../scripts/health/semver-floor.cjs';

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

  it('rejects unnamed exact-floor prereleases for next-auth and @auth/core', () => {
    const authFloor = { major: 4, minor: 24, patch: 15 };
    const coreFloor = { major: 0, minor: 41, patch: 3 };
    const authOpts = { allowMajorGte: 5 };

    expect(isPrereleaseSpec('4.24.15-dev.1')).toBe(true);
    expect(isPrereleaseSpec('0.41.3-0')).toBe(true);
    expect(isPrereleaseSpec('^4.24.15')).toBe(false);
    expect(isPrereleaseSpec('4.24.15')).toBe(false);

    expect(versionMeetsSecurityFloor('4.24.15-dev.1', authFloor, authOpts)).toBe(false);
    expect(versionMeetsSecurityFloor('4.24.15-0', authFloor, authOpts)).toBe(false);
    expect(versionMeetsSecurityFloor('0.41.3-0', coreFloor)).toBe(false);
    expect(versionMeetsSecurityFloor('0.41.3-dev.1', coreFloor)).toBe(false);

    expect(versionMeetsSecurityFloor('4.24.15', authFloor, authOpts)).toBe(true);
    expect(versionMeetsSecurityFloor('^4.24.15', authFloor, authOpts)).toBe(true);
    expect(versionMeetsSecurityFloor('0.41.3', coreFloor)).toBe(true);
    expect(versionMeetsSecurityFloor('5.0.0-beta.32', authFloor, authOpts)).toBe(true);
  });
});
