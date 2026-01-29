'use client';

import { useMemo } from 'react';

function formatUtc(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;

  const formatted = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(d);

  return `${formatted} UTC`;
}

export function BuildInfoFloatingBadge() {
  const commitDateIso = (process.env.NEXT_PUBLIC_GIT_COMMIT_DATE || '').trim();
  const buildVersion = (process.env.NEXT_PUBLIC_BUILD_VERSION || '').trim();

  const label = useMemo(() => {
    const datePart = commitDateIso ? formatUtc(commitDateIso) : '';
    const versionPart = buildVersion ? ` · Version ${buildVersion}` : '';
    return `${datePart}${versionPart}`.trim();
  }, [commitDateIso, buildVersion]);

  if (!label) return null;

  return (
    <div className="hidden md:flex fixed bottom-4 left-4 z-50 pointer-events-none select-none">
      <div
        className="rounded-md bg-black/60 text-white/80 px-2 py-1 text-[10px] leading-none backdrop-blur-sm border border-white"
        title={`Git commit date: ${commitDateIso || 'unknown'}${buildVersion ? ` | version: ${buildVersion}` : ''}`}
      >
        {label}
      </div>
    </div>
  );
}

