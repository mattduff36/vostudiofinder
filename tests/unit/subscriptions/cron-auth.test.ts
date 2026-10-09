/** @jest-environment node */
import { GET } from '@/app/api/cron/check-subscriptions/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
jest.mock('@/lib/db',()=>({db:{studio_profiles:{findMany:jest.fn().mockResolvedValue([])}}}));
jest.mock('@/lib/subscriptions/enforcement',()=>({computeEnforcementDecisions:()=>[],applyEnforcementDecisions:async()=>({statusUpdates:0,unfeaturedUpdates:0,downgrades:0})}));
beforeEach(()=>{process.env.CRON_SECRET='test-secret';jest.clearAllMocks();});
it('accepts Vercel Bearer authorization',async()=>expect((await GET(new NextRequest('http://localhost/api/cron/check-subscriptions',{headers:{authorization:'Bearer test-secret'}}))).status).toBe(200));
it('rejects missing and wrong secrets before reading data',async()=>{
  for(const headers of [{},{authorization:'Bearer wrong'}])expect((await GET(new NextRequest('http://localhost/api/cron/check-subscriptions',{headers}))).status).toBe(401);
  expect(db.studio_profiles.findMany).not.toHaveBeenCalled();
});
