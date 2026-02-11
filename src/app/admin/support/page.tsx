import { redirect } from 'next/navigation';

/**
 * Redirects old /admin/support bookmarks to the new /admin/suggestions page.
 * Support issues are now handled via email; only suggestions appear in the admin panel.
 */
export default function AdminSupportRedirect() {
  redirect('/admin/suggestions');
}
