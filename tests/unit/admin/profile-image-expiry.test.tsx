import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProfileEditForm, type ProfileEditFormHandle } from '@/components/dashboard/ProfileEditForm';
import { ImageGalleryManager, type StudioImage } from '@/components/dashboard/ImageGalleryManager';
import { adminProfileToProfileData, type AdminProfileResponse } from '@/lib/profile/adminProfileAdapter';
import { createProfileWriteCoordinator } from '@/lib/profile/write-coordinator';
import { showError } from '@/lib/toast';
import { IMAGE_RIGHTS_CONFIRMATION_TEXT } from '@/lib/legal/image-rights';

jest.mock('framer-motion', () => {
  const React = require('react');
  const component = (tag: string) => React.forwardRef(({ initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _h, whileTap: _p, children, ...props }: any, ref: any) => React.createElement(tag, { ...props, ref }, children));
  return { motion: { div: component('div'), button: component('button') } };
});
jest.mock('@/components/images/ImageCropperModal', () => ({
  ImageCropperModal: ({ file, isOpen, onConfirm }: any) => isOpen ? <button onClick={() => onConfirm(file)}>Confirm test crop</button> : null,
}));
jest.mock('@/components/profile/AvatarUpload', () => ({ AvatarUpload: () => null }));
jest.mock('@/components/maps/AddressPreviewMap', () => ({ AddressPreviewMap: () => null }));
jest.mock('@/components/ui/AddressAutocomplete', () => ({ AddressAutocomplete: () => null }));
jest.mock('@/components/ui/CountryAutocomplete', () => ({ CountryAutocomplete: () => null }));
jest.mock('@/components/dashboard/ProgressIndicators', () => ({ ProgressIndicators: () => null }));
jest.mock('@/lib/toast', () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn(), showWarning: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const originalFetch = global.fetch;
const originalClone = global.structuredClone;
const firstImage: StudioImage = { id: 'image-1', image_url: '/first.jpg', alt_text: 'Original image', sort_order: 0 };
const uploadedImage: StudioImage = { id: 'image-2', image_url: '/uploaded.jpg', alt_text: 'Acknowledged upload', sort_order: 1 };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const response = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, statusText: 'Fixture response', headers: new Headers(), json: async () => copy(data) }) as Response;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
function fixture(expiry: string | null = '2027-01-20T00:00:00.000Z'): AdminProfileResponse {
  return { profile: { id: 'studio-fixture', username: 'studio-fixture', display_name: 'Studio Owner', email: 'admin@mpdee.co.uk', email_verified: true,
    status: 'ACTIVE', joined: '2025-10-01T00:00:00.000Z', avatar_image: null, studioTypes: [], name: 'Fixture Studio',
    _meta: { membership_expires_at: expiry, membership_tier: 'PREMIUM' }, images: [{ ...firstImage, alt_text: firstImage.alt_text ?? null }] } };
}
function editor(initialSection: 'images' | 'admin', persisted = jest.fn()) {
  const ref = createRef<ProfileEditFormHandle>();
  const view = render(<ProfileEditForm ref={ref} userId="owner-fixture" mode="modal" dataSource="admin" adminStudioId="studio-fixture" isAdminUI initialSection={initialSection} onPersistedChange={persisted} />);
  return { ref, ...view };
}
function startUpload(container: HTMLElement) {
  fireEvent.click(screen.getByRole('checkbox', { name: IMAGE_RIGHTS_CONFIRMATION_TEXT }));
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['fixture'], 'photo.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm test crop' }));
}
beforeEach(() => { jest.clearAllMocks(); global.structuredClone = copy; });
afterEach(() => { cleanup(); global.fetch = originalFetch; global.structuredClone = originalClone; });

it('keeps an acknowledged upload after an actual profile section remount without overwriting another field draft', async () => {
  const upload = deferred<Response>(); const saved = jest.fn();
  const fetchMock = jest.fn((url: string, options?: RequestInit) => options?.method === 'POST' ? upload.promise : Promise.resolve(response(fixture())));
  global.fetch = fetchMock as typeof fetch;
  const view = editor('images', saved);
  await screen.findByRole('checkbox', { name: IMAGE_RIGHTS_CONFIRMATION_TEXT });
  startUpload(view.container);
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/studios/studio-fixture/images', expect.objectContaining({ method: 'POST' }));

  const sections = screen.getByRole('navigation', { name: 'Profile sections' });
  fireEvent.click(within(sections).getByRole('button', { name: 'Basic Info' }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'Display Name' }), { target: { value: 'Unsaved display name' } });
  fireEvent.click(within(sections).getByRole('button', { name: 'Images' }));
  await screen.findByRole('checkbox', { name: IMAGE_RIGHTS_CONFIRMATION_TEXT });
  expect(screen.queryByAltText('Acknowledged upload')).not.toBeInTheDocument();

  await act(async () => upload.resolve(response({ data: uploadedImage })));
  await waitFor(() => expect(screen.getAllByAltText('Acknowledged upload')).toHaveLength(2));
  expect(saved).toHaveBeenCalledWith({ studioId: 'studio-fixture', kind: 'images' });
  expect(fetchMock.mock.calls.filter(([, options]) => !options?.method)).toHaveLength(1);
  fireEvent.click(within(sections).getByRole('button', { name: 'Basic Info' }));
  expect(await screen.findByRole('textbox', { name: 'Display Name' })).toHaveValue('Unsaved display name');
  expect(view.ref.current?.hasUnsavedChanges()).toBe(true);
});

it('does not let an obsolete standalone GET replace a supplied embedded acknowledgement', async () => {
  const read = deferred<Response>(); global.fetch = jest.fn(() => read.promise) as typeof fetch;
  const view = render(<ImageGalleryManager isAdminMode studioId="studio-fixture" />);
  view.rerender(<ImageGalleryManager isAdminMode studioId="studio-fixture" embedded images={[firstImage, uploadedImage]} />);
  expect(await screen.findAllByAltText('Acknowledged upload')).toHaveLength(2);
  await act(async () => read.resolve(response(fixture())));
  expect(screen.getAllByAltText('Acknowledged upload')).toHaveLength(2);
});

it('still loads a standalone owner gallery and uses its returned membership image limit', async () => {
  const data = adminProfileToProfileData(fixture());
  global.fetch = jest.fn(async () => response({ data: { ...data, tierLimits: { imagesMax: 5 } } })) as typeof fetch;
  render(<ImageGalleryManager />);
  expect(await screen.findAllByAltText('Original image')).toHaveLength(2);
  expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', expect.objectContaining({ cache: 'no-store' }));
  expect(screen.getByText('PNG, JPG, WebP up to 5MB (max 5 images)')).toBeInTheDocument();
});

it('uses the parent owner tier limit and keeps an optimistic reorder only until the server rejects it', async () => {
  const write = deferred<Response>(); global.fetch = jest.fn(() => write.promise) as typeof fetch;
  const onImagesChanged = jest.fn();
  render(<ImageGalleryManager embedded images={[firstImage, uploadedImage]} imageLimit={5} onImagesChanged={onImagesChanged} />);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByText('PNG, JPG, WebP up to 5MB (max 5 images)')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Down' })[0]!);
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('alt', 'Acknowledged upload');
  await act(async () => write.resolve(response({ error: 'Rejected fixture' }, 500)));
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('alt', 'Original image');
  expect(onImagesChanged).not.toHaveBeenCalled();
  expect(showError).toHaveBeenCalledWith('Image order could not be saved. Please try again.');
});

it('leaves a global failure notice when a close waiting for an upload completes after rejection', async () => {
  const upload = deferred<Response>(); global.fetch = jest.fn(() => upload.promise) as typeof fetch;
  const writes = createProfileWriteCoordinator();
  function ClosingFixture() {
    const [open, setOpen] = useState(true);
    return <><button onClick={async () => { await writes.waitForPendingSaves(); setOpen(false); }}>Close editor</button>
      {open ? <ImageGalleryManager embedded images={[]} beginWrite={() => writes.begin('images')} endWrite={() => writes.end('images')} /> : <p>Editor closed</p>}</>;
  }
  const view = render(<ClosingFixture />); startUpload(view.container);
  fireEvent.click(screen.getByRole('button', { name: 'Close editor' }));
  expect(screen.queryByText('Editor closed')).not.toBeInTheDocument();
  await act(async () => upload.resolve(response({ error: 'Upload was rejected' }, 500)));
  expect(await screen.findByText('Editor closed')).toBeInTheDocument();
  expect(showError).toHaveBeenCalledWith('Image upload failed. Please try again.');
});

it('makes a Never Expires-only edit dirty and persists null through the modal save handle', async () => {
  let remote = fixture(); let payload: any;
  global.fetch = jest.fn(async (_url, options?: RequestInit) => {
    if (options?.method === 'PUT') {
      payload = JSON.parse(options.body as string); remote = fixture(payload._meta.membership_expires_at);
      return response({ success: true });
    }
    return response(remote);
  }) as typeof fetch;
  const view = editor('admin'); const toggle = await screen.findByRole('switch', { name: 'Never Expires' });
  expect(toggle).toHaveAttribute('aria-checked', 'false'); expect(view.ref.current?.hasUnsavedChanges()).toBe(false);
  fireEvent.click(toggle);
  expect(view.ref.current?.hasUnsavedChanges()).toBe(true);
  screen.getAllByRole('button', { name: 'Save Changes' }).forEach(button => expect(button).toBeEnabled());
  // This is the handle used by the modal's Save-and-close branch.
  let saved = false; await act(async () => { saved = await view.ref.current!.saveIfDirty(); });
  expect(saved).toBe(true); expect(payload._meta.membership_expires_at).toBeNull();
  expect(view.ref.current?.hasUnsavedChanges()).toBe(false);
  expect(screen.getByRole('switch', { name: 'Never Expires' })).toHaveAttribute('aria-checked', 'true');
});

it('keeps an expiry-only draft dirty if its save fails', async () => {
  global.fetch = jest.fn(async (_url, options?: RequestInit) => options?.method === 'PUT' ? response({ error: 'Fixture failed save' }, 500) : response(fixture())) as typeof fetch;
  const view = editor('admin'); fireEvent.click(await screen.findByRole('switch', { name: 'Never Expires' }));
  let saved = true; await act(async () => { saved = await view.ref.current!.saveIfDirty(); });
  expect(saved).toBe(false); expect(view.ref.current?.hasUnsavedChanges()).toBe(true);
  expect(screen.getByRole('switch', { name: 'Never Expires' })).toHaveAttribute('aria-checked', 'true');
});

it('requires an explicit date when Never Expires is turned off and preserves the UTC date contract', async () => {
  let payload: any;
  global.fetch = jest.fn(async (_url, options?: RequestInit) => {
    if (options?.method === 'PUT') { payload = JSON.parse(options.body as string); return response({ success: true }); }
    return response(fixture(payload?._meta.membership_expires_at ?? null));
  }) as typeof fetch;
  const view = editor('admin'); fireEvent.click(await screen.findByRole('switch', { name: 'Never Expires' }));
  const input = screen.getByLabelText('Membership expiry date');
  expect(input).toHaveValue(''); expect(view.ref.current?.hasUnsavedChanges()).toBe(false);
  fireEvent.change(input, { target: { value: '2028-02-29' } });
  expect(view.ref.current?.hasUnsavedChanges()).toBe(true);
  await act(async () => { await view.ref.current!.saveIfDirty(); });
  expect(payload._meta.membership_expires_at).toBe('2028-02-29T00:00:00.000Z');
});
