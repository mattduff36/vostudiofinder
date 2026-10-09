/** @jest-environment node */
import { randomUUID } from 'crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { db } from '@/lib/db';
import { endStripeSubscription } from '@/lib/subscriptions/stripe-deletion';
import { performDowngrade } from '@/lib/subscriptions/downgrade';
import { recordLoginAndClaimLegacyOffer } from '@/lib/subscriptions/legacy-offer';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
jest.mock('@/lib/db', () => { const { PrismaClient } = require('@prisma/client'); return { db: new PrismaClient() }; });
jest.mock('@/lib/email/send-templated',()=>({sendTemplatedEmail:jest.fn().mockResolvedValue({success:true})}));
const ids: string[]=[];
const past=new Date(Date.now()-86400000);
const future=new Date(Date.now()+86400000*100);
async function seed(options: { hidden?:boolean; voiceover?:boolean; deletion?:boolean; future?:boolean; priorLogin?:boolean }={}) {
  const id='repair_'+randomUUID();ids.push(id);const now=new Date();
  await db.users.create({data:{id,email:`${id}@example.test`,username:id.replace(/-/g,''),display_name:'Repair test',status:'ACTIVE',email_verified:true,membership_tier:'PREMIUM',updated_at:now,
    deletion_status: options.deletion?'PENDING_DELETION':'ACTIVE',last_login:options.priorLogin?past:null,
    studio_profiles:{create:{id:'s_'+id,name:'Test studio',status:options.hidden?'INACTIVE':'ACTIVE',is_profile_visible:!options.hidden,is_premium:true,created_at:new Date('2025-09-01'),updated_at:now,
      studio_studio_types:{create:{id:'t_'+id,studio_type:options.voiceover?'VOICEOVER':'HOME'}}}},
    subscriptions:{create:{id:'sub_'+id,status:'ACTIVE',current_period_start:past,current_period_end:options.future?future:past,updated_at:now}},
  }});return id;
}
beforeAll(()=>{const url=new URL(process.env.TEST_DATABASE_URL!);if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/vosf_repair')throw new Error('Only disposable local repair DB allowed');});
afterAll(async()=>{await db.subscriptions.deleteMany({where:{user_id:{in:ids}}});await db.users.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
beforeEach(()=>jest.clearAllMocks());
it('concurrent expiry calls apply once and send once, retaining ACTIVE',async()=>{
 const id=await seed();const results=await Promise.all([performDowngrade(id),performDowngrade(id)]);
 expect(results.filter(r=>r.downgraded)).toHaveLength(1);expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
 expect(await db.studio_profiles.findUnique({where:{user_id:id}})).toMatchObject({status:'ACTIVE',is_profile_visible:true,is_premium:false});
});
it('concurrent first logins claim the offer once; later login does not extend',async()=>{
 const id=await seed();await Promise.all([recordLoginAndClaimLegacyOffer(id),recordLoginAndClaimLegacyOffer(id)]);
 const first=await db.subscriptions.findMany({where:{user_id:id},orderBy:{created_at:'desc'}});expect(first).toHaveLength(2);
 await recordLoginAndClaimLegacyOffer(id);
 const after=await db.subscriptions.findMany({where:{user_id:id},orderBy:{created_at:'desc'}});
 expect(after).toHaveLength(2);expect(after[0].current_period_end).toEqual(first[0].current_period_end);
});
it('an unexpired historical grant remains unchanged',async()=>{
 const id=await seed({priorLogin:true,future:true});await recordLoginAndClaimLegacyOffer(id);
 expect(await db.subscriptions.count({where:{user_id:id}})).toBe(1);
 expect((await db.subscriptions.findFirst({where:{user_id:id}}))?.current_period_end).toEqual(future);
});
it('ambiguous prior login is marked review, never receives another grant',async()=>{
 const id=await seed({priorLogin:true});await recordLoginAndClaimLegacyOffer(id);
 expect((await db.user_metadata.findUnique({where:{user_id_key:{user_id:id,key:'legacy_premium_offer_state'}}}))?.value).toBe('review');
 expect(await db.subscriptions.count({where:{user_id:id}})).toBe(1);
});
it('owner-hidden and deletion-requested profiles never become public',async()=>{
 const hidden=await seed({hidden:true});const deleting=await seed({deletion:true});
 await performDowngrade(hidden,{sendEmail:false});await performDowngrade(deleting,{sendEmail:false});
 expect(await db.studio_profiles.findUnique({where:{user_id:hidden}})).toMatchObject({status:'INACTIVE',is_profile_visible:false});
 expect((await db.users.findUnique({where:{id:deleting}}))?.membership_tier).toBe('PREMIUM');
});
it('VOICEOVER is retained for recovery, hidden without inventing HOME',async()=>{
 const id=await seed({voiceover:true});await performDowngrade(id);
 expect((await db.studio_profiles.findUnique({where:{user_id:id}}))?.is_profile_visible).toBe(false);
 const types=await db.studio_studio_types.findMany({where:{studio_id:'s_'+id}});expect(types.map(t=>t.studio_type)).toEqual(['VOICEOVER']);
 expect(sendTemplatedEmail).toHaveBeenCalledWith(expect.objectContaining({variables:expect.objectContaining({visibilityMessage:expect.stringContaining('not currently public')})}));
});
it('fresh entitlement wins over a stale downgrade decision',async()=>{
 const id=await seed({future:true});expect((await performDowngrade(id)).downgraded).toBe(false);
 expect((await db.users.findUnique({where:{id}}))?.membership_tier).toBe('PREMIUM');expect(sendTemplatedEmail).not.toHaveBeenCalled();
});

it('snapshot recovery applies once, refuses stale snapshots, and rolls back exactly', async()=>{
 const id=await seed(); const hidden=await seed({hidden:true});
 await db.studio_profiles.update({where:{user_id:id},data:{status:'INACTIVE',city:'Test city',latitude:51,longitude:1}});
 const template=await db.email_templates.create({data:{key:'legacy-user-announcement',name:'Test',subject:'Test',heading:'Test',body_paragraphs:[],bullet_items:[],variable_schema:{}}});
 const campaign=await db.email_campaigns.create({data:{name:'Test',template_key:template.key,filters:{},created_by_id:id,status:'SENT'}});
 await db.email_deliveries.create({data:{campaign_id:campaign.id,user_id:id,to_email:`${id}@example.test`,status:'SENT'}});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vosf-recovery-test-'));const envFile=path.join(dir,'test.env');const snapshot=path.join(dir,'snapshot.json');
 fs.writeFileSync(envFile,`DATABASE_URL=${process.env.TEST_DATABASE_URL}\n`);
 const run=(...extra:string[])=>execFileSync(process.execPath,['--import','tsx','scripts/recover-expired-memberships.ts','--env-file',envFile,'--expected-host','127.0.0.1','--snapshot',snapshot,...extra],{cwd:process.cwd(),encoding:'utf8',stdio:'pipe'});
 try {
  run(); const plan=JSON.parse(fs.readFileSync(snapshot,'utf8'));expect(plan.selected.map((r:any)=>r.user_id)).toEqual([id]);
  run('--apply');expect((await db.users.findUnique({where:{id}}))?.membership_tier).toBe('BASIC');
  expect((await db.studio_profiles.findUnique({where:{user_id:id}}))?.status).toBe('ACTIVE');
  expect((await db.studio_profiles.findUnique({where:{user_id:hidden}}))?.is_profile_visible).toBe(false);
  expect(()=>run('--apply')).toThrow();
  run('--rollback');expect((await db.users.findUnique({where:{id}}))?.membership_tier).toBe('PREMIUM');
  expect((await db.studio_profiles.findUnique({where:{user_id:id}}))?.status).toBe('INACTIVE');
  expect(await db.user_metadata.count({where:{user_id:id,key:'membership_recovery_run'}})).toBe(0);
 } finally {
  await db.email_campaigns.delete({where:{id:campaign.id}});await db.email_templates.delete({where:{id:template.id}});
  if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected test directory');
  fs.rmSync(dir,{recursive:true});
 }
});

it('deleting an old Stripe subscription preserves a newer paid membership', async()=>{
 const id=await seed({future:true});
 await db.subscriptions.update({where:{id:'sub_'+id},data:{stripe_subscription_id:'old_'+id,created_at:new Date('2025-01-01')}});
 await db.subscriptions.create({data:{id:'new_'+id,user_id:id,status:'ACTIVE',stripe_subscription_id:'new_'+id,current_period_end:future,updated_at:new Date()}});
 await endStripeSubscription('old_'+id);
 expect((await db.users.findUnique({where:{id}}))?.membership_tier).toBe('PREMIUM');
 expect((await db.subscriptions.findUnique({where:{id:'sub_'+id}}))?.status).toBe('CANCELLED');
 expect(sendTemplatedEmail).not.toHaveBeenCalled();
});
it('deleting the current Stripe subscription uses the same Basic transition', async()=>{
 const id=await seed({future:true});await db.subscriptions.update({where:{id:'sub_'+id},data:{stripe_subscription_id:'current_'+id}});
 await endStripeSubscription('current_'+id);
 expect((await db.users.findUnique({where:{id}}))?.membership_tier).toBe('BASIC');
 expect((await db.studio_profiles.findUnique({where:{user_id:id}}))?.status).toBe('ACTIVE');
});
