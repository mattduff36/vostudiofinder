import { cleanup, render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { AdminBuildInfoBadge } from '@/components/admin/AdminBuildInfoBadge';
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/admin/sandbox-store', () => ({ useAdminSandbox: () => ({ enabled: true }), updateAdminSandbox: jest.fn() }));
jest.mock('@/components/profile/BuildInfoFloatingBadge', () => ({ BuildInfoFloatingBadge: () => <span>Build info fixture</span> }));
jest.mock('@/lib/toast', () => ({ showError: jest.fn() }));
afterEach(cleanup);
it.each([
  ['ADMIN', 'ordinary@example.test', 'ordinary', true],
  ['ADMIN', 'admin@mpdee.co.uk', 'mpdee', true],
  ['ADMIN', 'guy@voiceoverguy.co.uk', 'VoiceoverGuy', true],
  ['USER', 'admin@mpdee.co.uk', 'mpdee', false],
  ['USER', 'ordinary@example.test', 'VoiceoverGuy', false],
  ['USER', 'ordinary@example.test', 'ordinary', false],
])('shows admin controls by role only: %s %s %s', (role, email, username, allowed) => {
  (useSession as jest.Mock).mockReturnValue({ status: 'authenticated', data: { user: { id: 'fixture', role, email, username } } });
  render(<AdminBuildInfoBadge />);
  expect(!!screen.queryByRole('button', { name: 'Sandbox Active' })).toBe(allowed);
  expect(!!screen.queryByText('Build info fixture')).toBe(allowed);
});
it('does not show controls without an authenticated identity', () => {
  (useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated', data: null }); render(<AdminBuildInfoBadge />);
  expect(screen.queryByText('Build info fixture')).not.toBeInTheDocument();
});
