/**
 * Mutating database integration tests must target an explicit isolated database.
 * They must not fall through to the shared development DATABASE_URL.
 */
export function requireTestDatabase(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Refusing to run mutating database integration tests: TEST_DATABASE_URL is not set. ' +
        'Set TEST_DATABASE_URL to an isolated test database (not the shared development DATABASE_URL). ' +
        'This is a missing test-environment prerequisite, not an application regression.'
    );
  }
  process.env.DATABASE_URL = url;
  return url;
}
