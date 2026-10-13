/** @jest-environment node */
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { GET as getTemplates, POST as createTemplate } from '@/app/api/admin/message-templates/route';
import { PATCH as updateTemplate, DELETE as deleteTemplate } from '@/app/api/admin/message-templates/[id]/route';
import { POST as reorderFaq } from '@/app/api/admin/faq/reorder/route';
import { POST as createUpdate } from '@/app/api/admin/platform-updates/route';
import { GET as getReservations } from '@/app/api/admin/reservations/route';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/db', () => ({ db: { admin_message_templates: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  faq: { findMany: jest.fn(), update: jest.fn() }, platform_updates: { create: jest.fn() }, users: { findMany: jest.fn() }, $transaction: jest.fn(), $executeRaw: jest.fn() } }));
const database = db as any;
const auth = getServerSession as jest.Mock;
const request = (body: unknown) => new NextRequest('http://localhost/api/admin/fixture', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const context = { params: Promise.resolve({ id: 'fixture' }) };
beforeEach(() => { jest.clearAllMocks(); database.admin_message_templates.findMany.mockResolvedValue([]); database.$transaction.mockImplementation(async (work: any) => work(database)); });

it.each([null, { user: { role: 'USER' } }, { user: { role: 'USER', email: 'admin@mpdee.co.uk' } }, { user: { role: 'USER', username: 'VoiceoverGuy' } }])('message templates require stored ADMIN role for every read/write (%p)', async session => {
  auth.mockResolvedValue(session);
  for (const response of [await getTemplates(), await createTemplate(request({ label: 'A', body: 'B' })), await updateTemplate(request({ body: 'changed' }), context), await deleteTemplate(request({}), context)]) expect(response.status).toBe(session ? 403 : 401);
  expect(database.admin_message_templates.create).not.toHaveBeenCalled(); expect(database.admin_message_templates.update).not.toHaveBeenCalled();
});
it('an ordinary ADMIN may read and save valid content regardless of email/username', async () => {
  auth.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN', email: 'another@example.invalid', username: 'another' } });
  database.admin_message_templates.findFirst.mockResolvedValue(null); database.admin_message_templates.create.mockResolvedValue({ id: 'fixture', label: 'A', body: 'B' });
  expect((await getTemplates()).status).toBe(200);
  expect((await createTemplate(request({ label: ' A ', body: ' B ' }))).status).toBe(200);
  expect(database.admin_message_templates.create).toHaveBeenCalledWith({ data: { label: 'A', body: 'B', sort_order: 1 } });
});
it('wrong types and whitespace fail before database writes, missing records are 404', async () => {
  auth.mockResolvedValue({ user: { role: 'ADMIN' } });
  expect((await createTemplate(request({ label: true, body: 'text' }))).status).toBe(400);
  expect((await updateTemplate(request({ label: '  ' }), context)).status).toBe(400);
  expect(database.admin_message_templates.create).not.toHaveBeenCalled(); expect(database.admin_message_templates.update).not.toHaveBeenCalled();
  database.admin_message_templates.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Missing', { code: 'P2025', clientVersion: '6' }));
  expect((await updateTemplate(request({ body: 'valid' }), context)).status).toBe(404);
});
it('invalid platform dates and arbitrary reservation status filters return 400', async () => {
  auth.mockResolvedValue({ user: { role: 'ADMIN' } });
  expect((await createUpdate(request({ title: '', description: 'Text', category: 'FIX', release_date: '2026-02-30', is_highlighted: false }))).status).toBe(400);
  expect((await getReservations(new NextRequest('http://localhost/api/admin/reservations?status=ACTIVE'))).status).toBe(400);
  expect(database.platform_updates.create).not.toHaveBeenCalled(); expect(database.users.findMany).not.toHaveBeenCalled();
});
it('FAQ order conflicts are detected inside the write transaction before any position update', async () => {
  auth.mockResolvedValue({ user: { role: 'ADMIN' } });
  database.faq.findMany.mockResolvedValue([{ id: 'b' }, { id: 'a' }]);
  const response = await reorderFaq(request({ expectedOrder: ['a', 'b'], faqs: [{ id: 'b', sort_order: 1 }, { id: 'a', sort_order: 2 }] }));
  expect(response.status).toBe(409); expect(database.$executeRaw).toHaveBeenCalledTimes(1); expect(database.faq.update).not.toHaveBeenCalled();
});
