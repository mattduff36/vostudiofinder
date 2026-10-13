import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { ConfirmDialog, showConfirm } from '@/components/ui/ConfirmDialog';
import { UnsavedChangesDialog, showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { ImageCropperModal } from '@/components/images/ImageCropperModal';
import { ImageModal } from '@/components/studio/profile/mobile/ImageModal';
import { MobileBurgerMenu } from '@/components/navigation/MobileBurgerMenu';

// CSS animation timing remains in browser checks; these tests exercise the real
// portal/ownership lifecycle when visible content mounts and unmounts.
jest.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(({ initial: _i, animate: _a, exit: _e, transition: _t, children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>);
  return { motion: { div: Div }, AnimatePresence: ({ children }: any) => <>{children}</> };
});
jest.mock('next/image', () => ({ __esModule: true, default: ({ fill: _f, priority: _p, sizes: _s, ...props }: any) => <img {...props} /> }));
jest.mock('react-easy-crop', () => ({ __esModule: true, default: () => <div>Crop fixture</div> }));
jest.mock('@/lib/image/crop', () => ({ getImageDataUrl: jest.fn(async () => 'data:image/png;base64,fixture'), getCroppedImage: jest.fn() }));
jest.mock('@/components/ui/FreeBadge', () => ({ FreeBadge: () => <span>Free</span> }));
jest.mock('@/hooks/useHasNewPlatformUpdates', () => ({ useHasNewPlatformUpdates: () => ({ hasNew: false }) }));
const originalMatchMedia = window.matchMedia;
const previousInert = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
let width = 375; const queries: Array<{ query: string; listener: () => void }> = [];
const matches = (query: string) => width <= Number(query.match(/max-width:\s*(\d+)/)?.[1] ?? 0);
const resize = (next: number) => { width = next; queries.forEach(item => item.listener()); };
let rects: jest.SpyInstance;
beforeAll(() => { if (!previousInert) Object.defineProperty(HTMLElement.prototype, 'inert', { configurable: true, get() { return this.hasAttribute('inert'); }, set(value) { this.toggleAttribute('inert', !!value); } }); });
afterAll(() => { if (!previousInert) delete (HTMLElement.prototype as any).inert; });
beforeEach(() => {
  width = 375; queries.length = 0; document.body.style.overflow = ''; document.documentElement.className = '';
  rects = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
  window.matchMedia = ((query: string) => ({ get matches() { return matches(query); }, media: query,
    addEventListener: (_event: string, listener: () => void) => queries.push({ query, listener }),
    removeEventListener: (_event: string, listener: () => void) => { const index = queries.findIndex(item => item.listener === listener); if (index >= 0) queries.splice(index, 1); } })) as typeof window.matchMedia;
});
afterEach(() => { cleanup(); rects.mockRestore(); window.matchMedia = originalMatchMedia; });
it('never registers an md drawer above md, and releases it when a visible drawer crosses its breakpoint', async () => {
  width = 1024; const view = render(<AdminDrawer isOpen title="Payment details" onClose={jest.fn()}><button>Refund</button></AdminDrawer>);
  expect(screen.queryByRole('dialog', { name: 'Payment details' })).not.toBeInTheDocument(); expect(document.body.style.overflow).toBe('');
  act(() => resize(767)); expect(await screen.findByRole('dialog', { name: 'Payment details' })).toBeInTheDocument(); expect(document.body.style.overflow).toBe('hidden');
  act(() => resize(768)); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(document.body.style.overflow).toBe('');
  view.unmount();
});
it('keeps the Suggestions drawer available at tablet widths until lg', async () => {
  width = 900; render(<AdminDrawer isOpen breakpoint="lg" title="Suggestion details" onClose={jest.fn()}><button>Reply</button></AdminDrawer>);
  expect(await screen.findByRole('dialog', { name: 'Suggestion details' })).toBeInTheDocument(); expect(document.body.style.overflow).toBe('hidden');
  act(() => resize(1024)); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(document.body.style.overflow).toBe('');
});
it('closes only the nested cropper on Escape, keeps the parent lock, and restores the triggering control', async () => {
  const parentClose = jest.fn(); const cropClose = jest.fn(); const file = new File(['fixture'], 'fixture.png', { type: 'image/png' });
  function Fixture() {
    const [parent, setParent] = useState(true); const [crop, setCrop] = useState(false);
    return <><button>Page control</button><Modal title="Edit studio" isOpen={parent} onClose={() => { parentClose(); setParent(false); }}>
      <button onClick={() => setCrop(true)}>Crop a photo</button>
      <ImageCropperModal file={file} isOpen={crop} onConfirm={jest.fn()} onCancel={() => { cropClose(); setCrop(false); }} />
    </Modal></>;
  }
  render(<Fixture />); const trigger = await screen.findByRole('button', { name: 'Crop a photo' }); trigger.focus(); fireEvent.click(trigger);
  expect(await screen.findByRole('dialog', { name: 'Crop image' })).toBeInTheDocument(); expect(document.documentElement).toHaveClass('image-modal-open');
  fireEvent.keyDown(document, { key: 'Escape' }); await waitFor(() => expect(cropClose).toHaveBeenCalledTimes(1));
  expect(parentClose).not.toHaveBeenCalled(); expect(document.body.style.overflow).toBe('hidden'); expect(document.activeElement).toBe(trigger);
  expect(document.documentElement).not.toHaveClass('image-modal-open'); fireEvent.keyDown(document, { key: 'Escape' });
  expect(parentClose).toHaveBeenCalledTimes(1); expect(document.body.style.overflow).toBe('');
});
it('retains the image document class if a cropper closes above an existing public image viewer', async () => {
  function Fixture() { const [crop, setCrop] = useState(false); return <>
    <ImageModal images={[{ image_url: '/fixture.png' }]} initialIndex={0} isOpen onClose={jest.fn()} />
    <button data-overlay-live onClick={() => setCrop(true)}>Fixture open crop</button>
    <ImageCropperModal file={new File(['fixture'], 'fixture.png', { type: 'image/png' })} isOpen={crop} onConfirm={jest.fn()} onCancel={() => setCrop(false)} />
  </>; }
  render(<Fixture />); await screen.findByRole('dialog', { name: 'Studio images' });
  fireEvent.click(screen.getByText('Fixture open crop')); await screen.findByRole('dialog', { name: 'Crop image' });
  fireEvent.keyDown(document, { key: 'Escape' }); await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crop image' })).not.toBeInTheDocument());
  expect(document.documentElement).toHaveClass('image-modal-open'); expect(document.body.style.overflow).toBe('hidden');
});
it('coalesces unsaved prompts and resolves queued confirmations without closing the parent', async () => {
  const close = jest.fn(); render(<><Modal title="Editor" isOpen onClose={close}><button>Edit field</button></Modal><ConfirmDialog /><UnsavedChangesDialog /></>);
  await screen.findByRole('dialog', { name: 'Editor' }); let first!: Promise<boolean>; let second!: Promise<boolean>;
  act(() => { first = showConfirm({ title: 'First operation', message: 'First' }); second = showConfirm({ title: 'Second operation', message: 'Second' }); });
  await screen.findByRole('dialog', { name: 'First operation' }); fireEvent.keyDown(document, { key: 'Escape' }); expect(await first).toBe(false);
  await screen.findByRole('dialog', { name: 'Second operation' }); fireEvent.click(screen.getByRole('button', { name: 'Confirm' })); expect(await second).toBe(true);
  expect(close).not.toHaveBeenCalled(); expect(document.body.style.overflow).toBe('hidden');
  let a!: Promise<string>; let b!: Promise<string>; act(() => { a = showUnsavedChangesDialog(); b = showUnsavedChangesDialog(); });
  expect(a).toBe(b); await screen.findByRole('dialog', { name: 'Unsaved Changes' }); fireEvent.click(screen.getByRole('button', { name: "Don't Save" }));
  expect(await a).toBe('discard'); expect(await b).toBe('discard'); expect(close).not.toHaveBeenCalled();
});
it('releases the mobile navigation overlay when the viewport becomes desktop', async () => {
  render(<MobileBurgerMenu session={null} isAdminUser={false} />);
  act(() => window.dispatchEvent(new Event('toggleMobileBurgerMenu')));
  await screen.findByRole('dialog', { name: 'Navigation' }); expect(document.body.style.overflow).toBe('hidden');
  act(() => resize(768)); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(document.body.style.overflow).toBe('');
});
