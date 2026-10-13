/** @jest-environment node */
import { handleMembershipExpiryUpdate } from '@/lib/admin/studios/update/transaction';
const tx = { subscriptions: { update: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }, studio_profiles: { update: jest.fn() } };
beforeEach(() => jest.clearAllMocks());
it('clears only the selected expiry without erasing subscription history or republishing', async () => {
  await handleMembershipExpiryUpdate(tx, { userId:'customer', studioId:'studio', newExpiryValue:null,
    currentSubscription:{id:'latest',current_period_end:new Date('2027-01-01'),status:'CANCELLED'}, skipStatusUpdate:false });
  expect(tx.subscriptions.update).toHaveBeenCalledWith({where:{id:'latest'},data:{current_period_end:null,updated_at:expect.any(Date)}});
  expect(tx.subscriptions.deleteMany).not.toHaveBeenCalled();
  expect(tx.studio_profiles.update).not.toHaveBeenCalled();
});
it('changing a date preserves a cancelled subscription status and listing hold', async () => {
  await handleMembershipExpiryUpdate(tx, {userId:'customer',studioId:'studio',newExpiryValue:'2028-01-01T00:00:00.000Z',
    currentSubscription:{id:'latest',current_period_end:new Date('2027-01-01'),status:'CANCELLED'},skipStatusUpdate:false});
  expect(tx.subscriptions.update.mock.calls[0][0].data).not.toHaveProperty('status');
  expect(tx.studio_profiles.update).not.toHaveBeenCalled();
});
it('omitted and unchanged expiry do not write', async () => {
  for (const value of [undefined, '2027-01-01T00:00:00.000Z']) await handleMembershipExpiryUpdate(tx, {userId:'customer',studioId:'studio',newExpiryValue:value,currentSubscription:{id:'latest',current_period_end:new Date('2027-01-01')},skipStatusUpdate:false});
  expect(tx.subscriptions.update).not.toHaveBeenCalled();
});
