'use client';

export function FreeBadge({ small }: { small?: boolean }) {
  return (
    <span
      className="absolute bg-yellow-500 text-white text-[11px] font-bold leading-none px-2 py-[3px] rounded-full pointer-events-none"
      style={{ transform: 'rotate(10deg)', top: small ? '-6px' : '-2px', right: '-6px' }}
    >
      FREE
    </span>
  );
}
