import { redirect } from 'next/navigation';

export default function BlogPage() {
  // Redirect to home page while blog is under development
  redirect('/');
}
