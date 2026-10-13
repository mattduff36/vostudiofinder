/** @jest-environment node */
import {randomUUID} from 'crypto';
import {db} from '@/lib/db';
import {prepareReply} from '@/lib/admin/support/replies';
import {handleMembershipExpiryUpdate} from '@/lib/admin/studios/update/transaction';
jest.mock('next-auth',()=>({getServerSession:jest.fn()}));
jest.mock('@/lib/auth',()=>({authOptions:{}}));
jest.mock('@/lib/email/campaign-provider',()=>({...jest.requireActual('@/lib/email/campaign-provider'),submitFrozenEmail:jest.fn(()=>{throw new Error('No real sends');})}));
jest.mock('@/lib/db', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Disposable TEST_DATABASE_URL is required');
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8') throw new Error('Refusing a non-fixture database');
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasources: { db: { url } } }) };
});

let userId:string,ticketId:string;
beforeAll(async()=>{
 userId=randomUUID();ticketId=randomUUID();
 await db.users.create({data:{id:userId,email:`${userId}@example.invalid`,username:`fixture${userId}`,display_name:'Invented test customer',updated_at:new Date()}});
 await db.support_tickets.create({data:{id:ticketId,user_id:userId,type:'SUGGESTION',category:'Fixture',message:'Synthetic test only',updated_at:new Date()}});
});
afterAll(async()=>{
 await db.support_reply_operations.deleteMany({where:{ticket_id:ticketId}});
 await db.subscriptions.deleteMany({where:{user_id:userId}});
 await db.users.delete({where:{id:userId}});await db.$disconnect();
});
it('serializes two different admins and keys against one reviewed ticket',async()=>{
 const ticket=await db.support_tickets.findUniqueOrThrow({where:{id:ticketId}});
 const input={message:'Synthetic reply',expectedUserId:userId,expectedRecipient:`${userId}@example.invalid`,expectedUpdatedAt:ticket.updated_at.toISOString()};
 const results=await Promise.allSettled(['admin-a','admin-b'].map(actor=>prepareReply(ticketId,actor,{...input,requestKey:randomUUID()})));
 expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
 expect(await db.support_reply_operations.count({where:{ticket_id:ticketId}})).toBe(1);
 const fresh=await db.support_tickets.findUniqueOrThrow({where:{id:ticketId}});
 await expect(prepareReply(ticketId,'admin-c',{...input,requestKey:randomUUID(),expectedUpdatedAt:fresh.updated_at.toISOString()})).rejects.toMatchObject({status:409});
});
it('clearing expiry retains older paid subscription rows and provider references',async()=>{
 const old=await db.subscriptions.create({data:{id:randomUUID(),user_id:userId,status:'ACTIVE',stripe_subscription_id:'sub_fixture_'+randomUUID(),current_period_end:new Date('2028-01-01'),updated_at:new Date()}});
 const latest=await db.subscriptions.create({data:{id:randomUUID(),user_id:userId,status:'CANCELLED',stripe_subscription_id:'sub_fixture_'+randomUUID(),current_period_end:new Date('2027-01-01'),updated_at:new Date()}});
 await db.$transaction(tx=>handleMembershipExpiryUpdate(tx,{userId,studioId:'unused',newExpiryValue:null,currentSubscription:latest,skipStatusUpdate:false}));
 expect(await db.subscriptions.count({where:{user_id:userId}})).toBe(2);
 expect(await db.subscriptions.findUnique({where:{id:old.id}})).toEqual(old);
 expect(await db.subscriptions.findUnique({where:{id:latest.id}})).toMatchObject({current_period_end:null,status:'CANCELLED',stripe_subscription_id:latest.stripe_subscription_id});
});
