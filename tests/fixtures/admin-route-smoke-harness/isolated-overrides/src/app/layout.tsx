import './globals.css';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { SessionProvider } from '@/components/providers/SessionProvider';

export default function FixtureLayout({ children }: { children: React.ReactNode }) {
  const session = { user: { id: 'fixture_admin', username: 'fixtureadmin', email: 'admin@example.invalid', display_name: 'Fixture Admin', role: 'ADMIN' as const, email_verified: true }, expires: '2099-01-01T00:00:00Z' };
  return <html lang="en"><body><SessionProvider session={session}><main className="pt-16 pb-40 md:pt-[72px] md:pb-0">{children}</main><div data-overlay-live><ToastProvider /></div><ConfirmDialog /><UnsavedChangesDialog /></SessionProvider></body></html>;
}
