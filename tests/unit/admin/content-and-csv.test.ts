/** @jest-environment node */
import { encodeCsv } from '@/lib/csv';
import { faqFields, faqReorderInput, messageTemplateFields, platformUpdateFields, releaseDate } from '@/lib/admin/content-validation';
import { moveFaq } from '@/lib/admin/faq-order';

it('moves items down and to the end with their final requested index', () => {
  expect(moveFaq(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  expect(moveFaq(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveFaq(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  expect(moveFaq(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
});
it('validates unique full FAQ order membership and consecutive positions', () => {
  expect(faqReorderInput.safeParse({ faqs: [{ id: 'b', sort_order: 1 }, { id: 'a', sort_order: 2 }], expectedOrder: ['a', 'b'] }).success).toBe(true);
  for (const faqs of [[{ id: 'a', sort_order: 1 }, { id: 'a', sort_order: 2 }], [{ id: 'b', sort_order: 2 }, { id: 'a', sort_order: 2 }], [{ id: 'foreign', sort_order: 1 }, { id: 'a', sort_order: 2 }]]) expect(faqReorderInput.safeParse({ faqs, expectedOrder: ['a', 'b'] }).success).toBe(false);
});
it('rejects blank content, wrong types and normalized impossible calendar dates', () => {
  expect(faqFields.safeParse({ question: '  ', answer: 'answer' }).success).toBe(false);
  expect(messageTemplateFields.safeParse({ label: 123, body: 'text' }).success).toBe(false);
  expect(releaseDate.safeParse('2026-02-30').success).toBe(false);
  expect(releaseDate.safeParse('2024-02-29').success).toBe(true);
  expect(platformUpdateFields.safeParse({ description: 'x', category: 'OTHER', release_date: '2026-10-12' }).success).toBe(false);
});
it('CSV preserves embedded quotes, commas, newlines and Unicode and neutralizes formulas', () => {
  const csv = encodeCsv([['Name', 'Email', 'Joined Date'], ['A, "B"\nÉlodie', '=cmd()', '12 October 2026'], ['\t+SUM(1)', '@value', '-10']]);
  expect(csv).toBe('"Name","Email","Joined Date"\r\n"A, ""B""\nÉlodie","\'=cmd()","12 October 2026"\r\n"\'\t+SUM(1)","\'@value","\'-10"');
});
