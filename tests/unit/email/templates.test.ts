/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: { email_templates: { findUnique: jest.fn() } } }));
import { db } from '@/lib/db';
import { EMAIL_TEMPLATES } from '@/lib/email/template-registry';
import { createSampleVariables, resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { loadResolvedTemplate, resolveTemplateRecord, templateStorageData } from '@/lib/email/template-store';
import { renderResolvedEmailTemplate } from '@/lib/email/render';
import { unsupportedCampaignVariables } from '@/lib/email/recipient-service';

const mockFindTemplate = jest.mocked(db.email_templates.findUnique);

beforeEach(() => mockFindTemplate.mockReset());
test.each(EMAIL_TEMPLATES.map(template => [template.key]))('all required samples render registry template %s locally', key => {
  const template = resolveTemplateRecord(key!, null);
  const output = renderResolvedEmailTemplate(template, createSampleVariables(template.variableSchema));
  expect(output.html).toContain('<html');
  expect(output.subject).not.toContain('{{');
  expect(output.html).not.toMatch(/\{\{[A-Za-z]/);
});

test('blank optional copy survives load, render and resave; a DB outage cannot choose defaults', async () => {
  const baseline = resolveTemplateRecord('email-verification', null);
  const edited = { ...baseline, revision: 1, preheader: '', ctaPrimaryLabel: '', ctaPrimaryUrl: '', footerText: '' };
  const record = { ...templateStorageData(edited), id: 'template-1', created_at: new Date(), updated_at: new Date(), created_by_id: null, updated_by_id: null };
  mockFindTemplate.mockResolvedValue(record);
  const resolved = await loadResolvedTemplate(baseline.key);
  expect(resolved.preheader).toBe('');
  expect(resolved.ctaPrimaryUrl).toBe('');
  expect(templateStorageData(resolved).preheader).toBe('');
  expect(renderResolvedEmailTemplate(resolved, createSampleVariables(resolved.variableSchema)).html).not.toContain('Verify email address</');
  mockFindTemplate.mockRejectedValue(new Error('database offline'));
  await expect(loadResolvedTemplate(baseline.key)).rejects.toThrow('database offline');
});

test('frozen template rendering does not load later database copy', () => {
  const template = resolveTemplateRecord('legacy-user-announcement', null);
  const frozen = structuredClone(template);
  template.subject = 'Changed after start';
  const rendered = renderResolvedEmailTemplate(frozen, createSampleVariables(frozen.variableSchema));
  expect(rendered.subject).not.toBe(template.subject);
  expect(mockFindTemplate).not.toHaveBeenCalled();
});

test('unsupported event data is blocked for campaigns; custom known recipient fields are supported', () => {
  expect(unsupportedCampaignVariables(resolveTemplateRecord('password-reset', null))).toContain('resetUrl');
  expect(unsupportedCampaignVariables(resolveTemplateRecord('legacy-user-announcement', null))).toEqual([]);
  const custom = resolvedEmailTemplateSchema.parse({ key: 'custom', name: 'Custom', subject: 'Hello', heading: 'Hello', bodyParagraphs: ['{{userEmail}}'], layout: 'STANDARD', isMarketing: true, isSystem: false, variableSchema: { userEmail: 'string' }, revision: 1 });
  expect(unsupportedCampaignVariables(custom)).toEqual([]);
});
