/** @jest-environment node */
import { NextRequest } from 'next/server';
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/db', () => ({ db: { $transaction: jest.fn(),
  email_templates: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  email_campaigns: { findUnique: jest.fn(), findMany: jest.fn() },
  email_deliveries: { findMany: jest.fn(), count: jest.fn() }, users: { findMany: jest.fn(), count: jest.fn() },
} }));
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/email-service';
import { GET as getUsers, POST as countSelected } from '@/app/api/admin/emails/users/route';
import { POST as reviewAudience } from '@/app/api/admin/emails/recipients/preview/route';
import { POST as createTemplate } from '@/app/api/admin/emails/templates/route';
import { GET as getTemplate, PATCH as patchTemplate, DELETE as deleteTemplate } from '@/app/api/admin/emails/templates/[key]/route';
import { POST as previewTemplate } from '@/app/api/admin/emails/preview/route';
import { POST as testTemplate } from '@/app/api/admin/emails/test-send/route';
import { POST as createCampaign } from '@/app/api/admin/emails/campaigns/route';
import { POST as startCampaign } from '@/app/api/admin/emails/campaigns/[id]/start/route';
import { POST as retryCampaign } from '@/app/api/admin/emails/campaigns/[id]/retry/route';
import { GET as getDeliveries } from '@/app/api/admin/emails/campaigns/[id]/deliveries/route';
import { createSampleVariables } from '@/lib/email/template-contract';
import { resolveTemplateRecord } from '@/lib/email/template-store';

const context = { params: Promise.resolve({ id: 'fixture-id', key: 'email-verification' }) };
const request = (body: unknown = {}, method = 'POST', query = '') => new NextRequest(`http://localhost/api/admin/emails/fixture${query}`, { method, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
const auth = jest.mocked(getServerSession);
beforeEach(() => { jest.clearAllMocks(); auth.mockResolvedValue({ user: { id: 'admin-fixture', role: 'ADMIN' }, expires: '2099-01-01' } as never); });

const protectedActions = [
  ['recipient browse', () => getUsers(request({}, 'GET'))],
  ['selected membership count', () => countSelected(request())],
  ['audience review', () => reviewAudience(request())],
  ['template creation', () => createTemplate(request())],
  ['template read', () => getTemplate(request({}, 'GET'), context)],
  ['template save', () => patchTemplate(request({}, 'PATCH'), context)],
  ['template delete', () => deleteTemplate(request({}, 'DELETE'), context)],
  ['draft preview', () => previewTemplate(request())],
  ['test send', () => testTemplate(request())],
  ['campaign creation', () => createCampaign(request())],
  ['campaign start', () => startCampaign(request(), context)],
  ['campaign retry', () => retryCampaign(request(), context)],
  ['delivery read', () => getDeliveries(request({}, 'GET'), context)],
] as const;

test.each(protectedActions)('%s denies a non-admin before database/provider work', async (_label, action) => {
  auth.mockResolvedValue({ user: { id: 'non-admin', role: 'USER' }, expires: '2099-01-01' } as never);
  expect((await action()).status).toBe(401);
  expect(db.$transaction).not.toHaveBeenCalled(); expect(db.users.findMany).not.toHaveBeenCalled(); expect(db.email_templates.findUnique).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
});

test.each([
  ['unknown recipient filter', () => getUsers(request({}, 'GET', '?verified=true'))],
  ['invalid recipient pagination', () => getUsers(request({}, 'GET', '?page=NaN'))],
  ['malformed selected ID', () => countSelected(request({ userIds: [''], filters: {} }))],
  ['unknown audience filter', () => reviewAudience(request({ templateKey: 'custom', audience: { mode: 'filters', filters: { unknown: true } } }))],
  ['missing creation key', () => createCampaign(request({ name: 'Draft', templateKey: 'custom', audience: { mode: 'selected', userIds: ['u'] } }))],
  ['missing review fingerprint', () => startCampaign(request(), context)],
  ['unbounded retry count', () => retryCampaign(request({ maxRetries: 1000 }), context)],
  ['unknown delivery status', () => getDeliveries(request({}, 'GET', '?status=INVALID'), context)],
  ['missing template revision', () => patchTemplate(request({ subject: 'New' }, 'PATCH'), context)],
  ['invalid test address', () => testTemplate(request({ templateKey: 'custom', variables: {}, recipientEmail: 'invalid' }))],
] as const)('%s returns an actionable validation error before database/provider work', async (_label, action) => {
  const response = await action(); expect(response.status).toBe(400); expect(await response.json()).toHaveProperty('error');
  expect(db.$transaction).not.toHaveBeenCalled(); expect(db.email_templates.findUnique).not.toHaveBeenCalled(); expect(db.email_campaigns.findUnique).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
});

test('custom creation cannot claim a registry key even when no database override exists', async () => {
  const input = { key: 'email-verification', name: 'Custom', subject: 'Custom', heading: 'Custom', bodyParagraphs: ['Custom'], layout: 'STANDARD', isMarketing: false, variableSchema: {} };
  const response = await createTemplate(request(input)); expect(response.status).toBe(409); expect(db.$transaction).not.toHaveBeenCalled();
});

test('preview and test share current draft rendering and a missing provider ID is not success', async () => {
  jest.mocked(db.email_templates.findUnique).mockResolvedValue(null);
  const template = resolveTemplateRecord('email-verification', null);
  const body = { templateKey: template.key, variables: createSampleVariables(template.variableSchema), draft: { subject: 'Unsaved preview subject', ctaPrimaryLabel: '', ctaPrimaryUrl: '' } };
  const preview = await previewTemplate(request(body)); expect(preview.status).toBe(200);
  const output = await preview.json(); expect(output.subject).toBe('Unsaved preview subject');
  jest.mocked(sendEmail).mockResolvedValue({ success: true });
  const rejected = await testTemplate(request({ ...body, recipientEmail: 'controlled@example.invalid' }));
  expect(rejected.status).toBe(502);
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'controlled@example.invalid', subject: output.subject, html: output.html }));
  expect(db.$transaction).not.toHaveBeenCalled();
});

test('delivery response projection excludes frozen payload, recipient tokens and submission keys', async () => {
  jest.mocked(db.email_campaigns.findUnique).mockResolvedValue({ id: 'fixture-id' } as never);
  jest.mocked(db.email_deliveries.findMany).mockResolvedValue([]); jest.mocked(db.email_deliveries.count).mockResolvedValue(0);
  expect((await getDeliveries(request({}, 'GET'), context)).status).toBe(200);
  const projection = jest.mocked(db.email_deliveries.findMany).mock.calls[0]![0]!.select;
  expect(projection).not.toHaveProperty('submission_payload'); expect(projection).not.toHaveProperty('submission_key'); expect(projection).not.toHaveProperty('submission_payload_hash');
});
