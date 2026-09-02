'use strict';

function parseSemverCore(input) {
  if (input == null) return null;
  const match = String(input).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function semverGte(a, b) {
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function formatSemver(version) {
  return version ? `${version.major}.${version.minor}.${version.patch}` : 'unknown';
}

/** True when the spec contains any semver prerelease suffix after X.Y.Z. */
function isPrereleaseSpec(input) {
  return /\d+\.\d+\.\d+-[0-9A-Za-z.-]+/.test(String(input || ''));
}

function isExactFloorPrerelease(spec, floor) {
  const parsed = parseSemverCore(spec);
  if (!parsed || !floor || !isPrereleaseSpec(spec)) return false;
  return parsed.major === floor.major && parsed.minor === floor.minor && parsed.patch === floor.patch;
}

function versionMeetsSecurityFloor(spec, floor, options = {}) {
  const parsed = parseSemverCore(spec);
  if (!parsed || !floor) return false;
  if (isExactFloorPrerelease(spec, floor)) return false;
  if (options.allowMajorGte != null && parsed.major >= options.allowMajorGte) return true;
  return semverGte(parsed, floor);
}

module.exports = {
  parseSemverCore,
  semverGte,
  formatSemver,
  isPrereleaseSpec,
  isExactFloorPrerelease,
  versionMeetsSecurityFloor,
};
