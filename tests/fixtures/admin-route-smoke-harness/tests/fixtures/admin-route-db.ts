import type { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

// This module is copied only into the isolated browser checkout. There is no
// database client or network fallback, and no mutation method is implemented.
const target = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.VSF_ADMIN_ROUTE_FIXTURE !== '1' || target.hostname !== '127.0.0.1' || target.port !== '59999') {
  throw new Error('Admin browser database fixture requires its explicit isolated configuration.');
}
const readModel = { count: async () => 0, findMany: async () => [] };
async function analyticsGuard() {
  if ((await cookies()).get('vsf_fixture_analytics_error')?.value === '1') throw new Error('Synthetic analytics read failure');
}
export const db = {
  users: readModel, studio_profiles: readModel, support_tickets: readModel,
  reviews: readModel, studio_studio_types: readModel,
  payments: { ...readModel, aggregate: async () => ({ _sum: { amount: 0 } }) },
  waitlist: { findMany: async () => [{ id: 'fixture_waitlist', name: 'Fixture Waitlist Owner', email: 'waiting@example.invalid', type: 'GENERAL', created_at: new Date('2026-10-12T12:00:00Z') }] },
  $queryRaw: async (parts: TemplateStringsArray) => {
    await analyticsGuard();
    return parts.join(' ').includes('GROUP BY DATE') ? [] : [{ visitors: 3n, pageviews: 6n }];
  },
  $queryRawUnsafe: async (query: string) => {
    await analyticsGuard();
    const keys: Record<string, string> = { path: '/studios', referrer: 'example.invalid', country: 'GB', browser: 'Chrome', os: 'Linux', device: 'desktop' };
    const column = query.match(/SELECT\s+(\w+)\s+AS key/)?.[1] || 'path';
    return [{ key: keys[column] || 'Fixture', visitors: 3n, pageviews: 6n }];
  },
} as unknown as PrismaClient;
export const prisma = db;
