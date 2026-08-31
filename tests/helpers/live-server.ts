/**
 * Prerequisite helper for live-server HTTP tests.
 * These tests are not self-contained: they require the Next.js app to be listening.
 */

export const LIVE_SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';

export function liveServerPrerequisiteMessage(baseUrl = LIVE_SERVER_BASE_URL): string {
  return (
    `Live-server HTTP tests require the Next.js app at ${baseUrl}. ` +
    'Start it with `npm run dev` (port 4000) or run `npm run test:live:start`. ' +
    'Nothing listening on that port is a missing prerequisite, not an application regression.'
  );
}

export async function assertLiveServerAvailable(
  baseUrl = LIVE_SERVER_BASE_URL
): Promise<void> {
  try {
    await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
  } catch {
    throw new Error(liveServerPrerequisiteMessage(baseUrl));
  }
}
