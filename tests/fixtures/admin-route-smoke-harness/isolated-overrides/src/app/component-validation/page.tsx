'use client';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ImageModal } from '@/components/studio/profile/mobile/ImageModal';
import { WhatsNewModal } from '@/components/whats-new/WhatsNewModal';

export default function ComponentValidation() {
  const [editor, setEditor] = useState(false);
  const [adminSelf, setAdminSelf] = useState(false);
  const [images, setImages] = useState(false);
  const [news, setNews] = useState(false);
  const user = { id: 'fixture_user_1', username: 'fixture1', email: 'fixture1@example.invalid', display_name: 'Fixture Owner 1', role: adminSelf ? 'ADMIN' : 'USER', email_verified: true };
  return <SessionProvider key={adminSelf ? 'admin' : 'owner'} session={{ user, expires: '2099-01-01T00:00:00Z' }} refetchOnWindowFocus={false}>
    <main className="p-8 space-y-4 min-h-[1800px]">
      <h1 className="text-3xl">Isolated component verification</h1>
      <button className="p-4 border" onClick={() => { setAdminSelf(false); setEditor(true); }}>Edit own profile</button>
      <button className="p-4 border" onClick={() => { setAdminSelf(true); setEditor(true); }}>Edit admin self profile</button>
      <button className="p-4 border" onClick={() => setImages(true)}>Open public images</button>
      <button className="p-4 border" onClick={() => setNews(true)}>Open what's new</button>
      <a className="block underline" href="/component-validation/destination">Fixture navigation</a>
    </main>
    <EditProfileModal isOpen={editor} onClose={() => setEditor(false)} userId="fixture_user_1" mode="owner" initialSection="basic" />
    <ImageModal images={[{ image_url: '/fixture.png', alt_text: 'First fixture image' }, { image_url: '/fixture.png', alt_text: 'Second fixture image' }]} initialIndex={0} isOpen={images} onClose={() => setImages(false)} />
    <WhatsNewModal isOpen={news} onClose={() => setNews(false)} />
  </SessionProvider>;
}
