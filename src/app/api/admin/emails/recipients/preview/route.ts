import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audienceSelectionSchema, parseStoredAudience } from '@/lib/email/recipients';
import { loadResolvedTemplate, EmailAdminError } from '@/lib/email/template-store';
import { resolveCampaignAudience } from '@/lib/email/recipient-service';
import { emailAdminFailure } from '@/lib/email/admin-api';

const schema = z.union([
  z.object({ campaignId: z.string().min(1).max(100) }).strict(),
  z.object({ templateKey: z.string().min(1).max(100), audience: audienceSelectionSchema }).strict(),
]);
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const input = schema.parse(await request.json());
    const preview = await db.$transaction(async tx => {
      const campaign = 'campaignId' in input ? await tx.email_campaigns.findUnique({ where: { id: input.campaignId } }) : null;
      if ('campaignId' in input && !campaign) throw new EmailAdminError('Campaign not found', 404);
      const key = 'templateKey' in input ? input.templateKey : campaign!.template_key;
      const audience = 'audience' in input ? input.audience : parseStoredAudience(campaign!.filters);
      const template = await loadResolvedTemplate(key, tx);
      const { recipients: _recipients, ...review } = await resolveCampaignAudience(audience, template, tx);
      return review;
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
    return NextResponse.json(preview);
  } catch (error) { return emailAdminFailure(error, 'Failed to review audience'); }
}
