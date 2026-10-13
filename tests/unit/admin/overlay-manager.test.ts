import { fireEvent } from '@testing-library/react';
import { acquireBodyScrollLock, overlayHost, ownAutocompletePopup, registerOverlay } from '@/lib/ui/overlay-manager';

const releases = new Set<() => void>();
let rects: jest.SpyInstance; let bounds: jest.SpyInstance;
const previousInert = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
function attach(id: string, html: string, parent = overlayHost()) {
  const element = document.createElement('div'); element.id = id; element.tabIndex = -1; element.dataset.overlayRoot = '';
  element.innerHTML = html; parent.appendChild(element); return element;
}
function register(id: string, element: HTMLElement, extra: Record<string, unknown> = {}) {
  const onEscape = jest.fn();
  const dispose = registerOverlay({ id, element, level: 'dialog', onEscape, ...extra } as Parameters<typeof registerOverlay>[0]);
  const release = () => { if (releases.delete(release)) dispose(); };
  releases.add(release); return { onEscape, release };
}
beforeAll(() => { if (!previousInert) Object.defineProperty(HTMLElement.prototype, 'inert', { configurable: true, get() { return this.hasAttribute('inert'); }, set(value) { this.toggleAttribute('inert', !!value); } }); });
afterAll(() => { if (!previousInert) delete (HTMLElement.prototype as any).inert; });
beforeEach(() => {
  document.body.innerHTML = ''; document.body.style.overflow = 'scroll'; document.body.className = ''; document.documentElement.className = '';
  rects = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return (this.style.display === 'none' ? [] : [{ width: 10, height: 10 }]) as any; });
  bounds = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, toJSON: () => ({}) });
});
afterEach(() => { for (const release of [...releases].reverse()) release(); rects.mockRestore(); bounds.mockRestore(); document.body.innerHTML = ''; });
it('keeps nested body/class ownership and prior inert state until the final owner closes', () => {
  const background = attach('background', '<button>Open</button>', document.body);
  const existingInert = document.createElement('aside'); existingInert.inert = true; document.body.appendChild(existingInert);
  document.body.classList.add('already-present');
  const parent = register('parent', attach('parent', '<button>Parent</button>'), { bodyClass: 'admin-modal-open', documentClass: 'image-modal-open' });
  const child = register('child', attach('child', '<button>Child</button>'), { bodyClass: 'admin-modal-open', documentClass: 'image-modal-open' });
  expect(document.body.style.overflow).toBe('hidden'); expect(background.inert).toBe(true);
  child.release(); expect(document.body.style.overflow).toBe('hidden'); expect(document.body).toHaveClass('admin-modal-open'); expect(document.documentElement).toHaveClass('image-modal-open');
  parent.release(); expect(document.body.style.overflow).toBe('scroll'); expect(background.inert).toBe(false); expect(existingInert.inert).toBe(true);
  expect(document.body).not.toHaveClass('admin-modal-open'); expect(document.documentElement).not.toHaveClass('image-modal-open'); expect(document.body).toHaveClass('already-present');
});
it('keeps a non-dialog fullscreen map scroll lock when the dialog closes', () => {
  const mapRelease = acquireBodyScrollLock();
  const modal = register('modal', attach('modal', '<button>Close</button>'));
  modal.release(); expect(document.body.style.overflow).toBe('hidden');
  mapRelease(); expect(document.body.style.overflow).toBe('scroll');
});
it('sends Escape to only the highest overlay and restores focus through parent to the original trigger', () => {
  const root = attach('page', '<button id="launch">Launch</button>', document.body); const launch = root.querySelector<HTMLButtonElement>('button')!; launch.focus();
  const baseElement = attach('base', '<button id="child-launch">Open child</button><button>Last parent control</button>');
  const base = register('base', baseElement); const childLaunch = baseElement.querySelector<HTMLButtonElement>('button')!; childLaunch.focus();
  const top = register('top', attach('top', '<button>Cancel</button><button>Save</button>'), { level: 'confirmation' });
  fireEvent.keyDown(document, { key: 'Escape' }); expect(top.onEscape).toHaveBeenCalledTimes(1); expect(base.onEscape).not.toHaveBeenCalled();
  top.release(); expect(document.activeElement).toBe(childLaunch);
  fireEvent.keyDown(document, { key: 'Escape' }); expect(base.onEscape).toHaveBeenCalledTimes(1);
  base.release(); expect(document.activeElement).toBe(launch);
});
it('traps Tab and redirects outside focus while excluding inactive overlays', () => {
  const background = attach('page', '<button id="outside">Outside</button>', document.body);
  const element = attach('focus', '<button id="first">First</button><button disabled>Disabled</button><button id="last">Last</button>');
  const modal = register('focus', element); const first = element.querySelector<HTMLButtonElement>('#first')!; const last = element.querySelector<HTMLButtonElement>('#last')!;
  expect(document.activeElement).toBe(first);
  last.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(document.activeElement).toBe(first);
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last);
  background.querySelector<HTMLButtonElement>('button')!.focus(); expect(document.activeElement).toBe(first);
  modal.release();
});
it('gives an owned autocomplete popup Escape priority and keeps it inert under a confirmation', () => {
  const element = attach('address', '<input aria-label="Address"><button>Save</button>'); const input = element.querySelector<HTMLInputElement>('input')!;
  const modal = register('address', element); const popup = document.createElement('div'); popup.className = 'pac-container'; popup.innerHTML = '<button>Address choice</button>'; document.body.appendChild(popup);
  ownAutocompletePopup(input); expect(popup.inert).toBe(false);
  fireEvent.keyDown(input, { key: 'Escape' }); expect(modal.onEscape).not.toHaveBeenCalled();
  const confirm = register('confirm', attach('confirm', '<button>Cancel</button>'), { level: 'confirmation' });
  expect(popup.inert).toBe(true); fireEvent.keyDown(document, { key: 'Escape' }); expect(confirm.onEscape).toHaveBeenCalledTimes(1);
  confirm.release(); popup.style.display = 'none'; fireEvent.keyDown(input, { key: 'Escape' }); expect(modal.onEscape).toHaveBeenCalledTimes(1);
});
it('uses a connected fallback after the original trigger is removed', () => {
  const root = attach('page', '<button id="launch">Launch</button><button id="fallback">Filter</button>', document.body);
  const launch = root.querySelector<HTMLButtonElement>('#launch')!; const fallback = root.querySelector<HTMLButtonElement>('#fallback')!; launch.focus();
  const modal = register('gone', attach('gone', '<button>Close</button>'), { fallbackFocus: () => fallback });
  launch.remove(); modal.release(); expect(document.activeElement).toBe(fallback);
});
