import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/payments
 * Supports two tabs (one-time | subscriptions) plus a revenue summary.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'one-time';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search');

    // ── Revenue summary (always returned) ────────────────────────────
    const summary = await computeRevenueSummary();

    // ── Subscriptions tab ────────────────────────────────────────────
    if (tab === 'subscriptions') {
      const result = await fetchSubscriptions({ page, limit, search, status });
      return NextResponse.json({ ...result, summary });
    }

    // ── One-time payments tab (default) ──────────────────────────────
    const result = await fetchOneTimePayments({ page, limit, search, status, userId });
    return NextResponse.json({ ...result, summary });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// ─── Revenue summary ──────────────────────────────────────────────────────────

async function computeRevenueSummary() {
  const allSucceeded = await db.payments.findMany({
    where: { status: 'SUCCEEDED' },
    select: { amount: true, refunded_amount: true, metadata: true },
  });

  let totalRevenue = 0;
  let oneTimeRevenue = 0;
  let subscriptionRevenue = 0;

  for (const p of allSucceeded) {
    const net = p.amount - p.refunded_amount;
    totalRevenue += net;

    const meta = p.metadata as Record<string, unknown> | null;
    if (meta && typeof meta === 'object' && 'subscription_id' in meta) {
      subscriptionRevenue += net;
    } else {
      oneTimeRevenue += net;
    }
  }

  const activeSubscriptions = await db.subscriptions.count({
    where: { status: 'ACTIVE', stripe_subscription_id: { not: null } },
  });

  return { totalRevenue, oneTimeRevenue, subscriptionRevenue, activeSubscriptions };
}

// ─── One-time payments ────────────────────────────────────────────────────────

async function fetchOneTimePayments(opts: {
  page: number;
  limit: number;
  search: string | null;
  status: string | null;
  userId: string | null;
}) {
  const { page, limit, search, status, userId } = opts;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;

  // Handle search
  if (search) {
    const users = await db.users.findMany({
      where: { email: { contains: search, mode: 'insensitive' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      return emptyPaymentsResponse(page, limit);
    }
    if (userId) {
      if (!ids.includes(userId)) return emptyPaymentsResponse(page, limit);
      where.user_id = userId;
    } else {
      where.user_id = { in: ids };
    }
  } else if (userId) {
    where.user_id = userId;
  }

  // Exclude subscription payments using Prisma JSON filtering.
  // A one-time payment either has no metadata or no subscription_id key.
  where.OR = [
    { metadata: { equals: Prisma.DbNull } },
    { NOT: { metadata: { path: ['subscription_id'], not: Prisma.DbNull } } },
  ];

  const [payments, total] = await Promise.all([
    db.payments.findMany({
      where,
      include: {
        users: {
          select: { id: true, email: true, username: true, display_name: true, role: true, created_at: true },
        },
        refunds: {
          include: {
            users_refunds_processed_byTousers: {
              select: { id: true, email: true, display_name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    db.payments.count({ where }),
  ]);

  return {
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

async function fetchSubscriptions(opts: {
  page: number;
  limit: number;
  search: string | null;
  status: string | null;
}) {
  const { page, limit, search, status } = opts;
  const skip = (page - 1) * limit;

  const where: any = {
    stripe_subscription_id: { not: null },
  };
  if (status) where.status = status;

  if (search) {
    const users = await db.users.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { display_name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      return emptySubscriptionsResponse(page, limit);
    }
    where.user_id = { in: ids };
  }

  const [subscriptions, total] = await Promise.all([
    db.subscriptions.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            membership_tier: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    db.subscriptions.count({ where }),
  ]);

  // Cross-reference payment records for amounts.
  // Batch-fetch payments where metadata->subscription_id matches any of these subscriptions.
  const userIds = subscriptions.map((s) => s.user_id);

  const relatedPayments = await db.payments.findMany({
    where: {
      user_id: { in: userIds },
      status: 'SUCCEEDED',
    },
    select: { user_id: true, amount: true, currency: true, metadata: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });

  // Build lookup: stripe_subscription_id -> payment
  const paymentBySubId = new Map<string, { amount: number; currency: string }>();
  const paymentByUserId = new Map<string, { amount: number; currency: string }>();

  for (const p of relatedPayments) {
    const meta = p.metadata as Record<string, unknown> | null;
    if (meta && typeof meta === 'object' && 'subscription_id' in meta) {
      const subId = meta.subscription_id as string;
      if (!paymentBySubId.has(subId)) {
        paymentBySubId.set(subId, { amount: p.amount, currency: p.currency });
      }
    }
    // Fallback: map by user_id for subscriptions without stripe_subscription_id
    if (!paymentByUserId.has(p.user_id)) {
      paymentByUserId.set(p.user_id, { amount: p.amount, currency: p.currency });
    }
  }

  const enrichedSubscriptions = subscriptions.map((sub) => {
    let paymentInfo = sub.stripe_subscription_id
      ? paymentBySubId.get(sub.stripe_subscription_id)
      : undefined;
    if (!paymentInfo) {
      paymentInfo = paymentByUserId.get(sub.user_id);
    }
    return {
      ...sub,
      payment_amount: paymentInfo?.amount ?? null,
      payment_currency: paymentInfo?.currency ?? null,
    };
  });

  return {
    subscriptions: enrichedSubscriptions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyPaymentsResponse(page: number, limit: number) {
  return {
    payments: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}

function emptySubscriptionsResponse(page: number, limit: number) {
  return {
    subscriptions: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}
