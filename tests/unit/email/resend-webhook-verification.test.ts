/** @jest-environment node */
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/resend/route';
import { db } from '@/lib/db';
jest.mock('@/lib/db',()=>({db:{email_deliveries:{findFirst:jest.fn(),update:jest.fn()}}}));
const secret = 'whsec_' + Buffer.from('fixture-signing-secret-only').toString('base64');
const body = JSON.stringify({type:'email.delivered',data:{email_id:'fixture-email'}});
function request(payload=body,offset=0,signature?:string){
 const timestamp=String(Math.floor(Date.now()/1000)+offset),id='msg_fixture';
 const sig=signature ?? 'v1,'+createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.${payload}`).digest('base64');
 return new NextRequest('http://localhost/api/webhooks/resend',{method:'POST',body:payload,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':sig}});
}
const original=process.env.RESEND_WEBHOOK_SECRET;
beforeEach(()=>{jest.clearAllMocks();process.env.RESEND_WEBHOOK_SECRET=secret;(db.email_deliveries.findFirst as jest.Mock).mockResolvedValue(null);});
afterAll(()=>{if(original===undefined)delete process.env.RESEND_WEBHOOK_SECRET;else process.env.RESEND_WEBHOOK_SECRET=original;});
it('accepts a fresh authentic event without calling any external provider',async()=>{expect((await POST(request())).status).toBe(200);expect(db.email_deliveries.findFirst).toHaveBeenCalledWith({where:{resend_id:'fixture-email'}});});
it.each([-600,600])('rejects an authentic but stale/future signature (%s seconds)',async offset=>{expect((await POST(request(body,offset))).status).toBe(401);expect(db.email_deliveries.findFirst).not.toHaveBeenCalled();});
it('rejects altered and missing signatures',async()=>{expect((await POST(request(body,0,'v1,invalid'))).status).toBe(401);expect((await POST(new NextRequest('http://localhost',{method:'POST',body}))).status).toBe(401);expect(db.email_deliveries.findFirst).not.toHaveBeenCalled();});
it('fails closed without a signing secret even in development',async()=>{delete process.env.RESEND_WEBHOOK_SECRET;expect((await POST(request())).status).toBe(503);expect(db.email_deliveries.findFirst).not.toHaveBeenCalled();});
it('rejects malformed signed event data before database access',async()=>{expect((await POST(request(JSON.stringify({type:'email.clicked',data:null})))).status).toBe(400);expect(db.email_deliveries.findFirst).not.toHaveBeenCalled();});
