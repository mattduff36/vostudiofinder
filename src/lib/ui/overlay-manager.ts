import { zIndex } from '@/lib/theme';

interface OverlayRegistration {
  id: string;
  element: HTMLElement;
  onEscape: () => void;
  level: 'navigation' | 'dialog' | 'confirmation';
  bodyClass?: string | undefined;
  documentClass?: string | undefined;
  fallbackFocus?: (() => HTMLElement | null) | undefined;
}
interface ActiveOverlay extends OverlayRegistration { restoreFocus: HTMLElement | null; sequence: number; layer: number }
const overlays = new Map<string, ActiveOverlay>();
const inertBefore = new Map<HTMLElement, boolean>();
const classesBefore = new Map<string, boolean>();
let sequence = 0;
let originalOverflow = '';
const scrollOwners = new Set<symbol>();
/** Fullscreen maps and portals share ownership; closing either cannot unlock the other. */
export function acquireBodyScrollLock() {
  const owner = Symbol('scroll-owner');
  if (!scrollOwners.size) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  scrollOwners.add(owner);
  return () => { scrollOwners.delete(owner); if (!scrollOwners.size) document.body.style.overflow = originalOverflow; };
}
let observer: MutationObserver | null = null;
const focusableSelector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

function topOverlay(): ActiveOverlay | undefined {
  return [...overlays.values()].sort((a, b) => b.layer - a.layer || b.sequence - a.sequence)[0];
}
function ownedRoots(top: ActiveOverlay): HTMLElement[] {
  return [top.element, ...Array.from(document.querySelectorAll<HTMLElement>('[data-overlay-owner]')).filter(node => node.dataset.overlayOwner === top.id)];
}
function inside(top: ActiveOverlay, element: Node): boolean { return ownedRoots(top).some(root => root.contains(element)); }
function visible(node: HTMLElement): boolean { return !node.closest('[hidden],[inert]') && node.getClientRects().length > 0; }
function focusables(top: ActiveOverlay): HTMLElement[] {
  return ownedRoots(top).flatMap(root => [...root.querySelectorAll<HTMLElement>(focusableSelector)]).filter(visible);
}
function focusFirst(top: ActiveOverlay) {
  const target = top.element.querySelector<HTMLElement>('[data-overlay-autofocus]') ?? focusables(top)[0] ?? top.element;
  target.focus({ preventScroll: true });
}
function updateInert() {
  const top = topOverlay();
  const host = document.getElementById('vsf-overlay-host');
  const candidates = [...document.body.children, ...(host ? [...host.children] : [])].filter((node): node is HTMLElement => node instanceof HTMLElement);
  for (const node of candidates) {
    // Keep the shared portal host, live notifications and the active dialog's
    // owned Google autocomplete popup accessible. Everything else is inert.
    const keep = !top || node === host || node.hasAttribute('data-overlay-live') || node.id === '_rht_toaster' || ownedRoots(top).some(root => node === root || node.contains(root));
    if (!inertBefore.has(node)) inertBefore.set(node, node.inert);
    node.inert = keep ? (inertBefore.get(node) ?? false) : true;
  }
}
function handleKey(event: KeyboardEvent) {
  const top = topOverlay();
  if (!top) return;
  if (event.key === 'Escape') {
    // Let the input dismiss its own visible autocomplete before its dialog.
    if (ownedRoots(top).some(node => node.classList.contains('pac-container') && visible(node) && node.getBoundingClientRect().height > 0)) return;
    event.preventDefault(); event.stopImmediatePropagation(); top.onEscape(); return;
  }
  if (event.key !== 'Tab') return;
  const nodes = focusables(top), first = nodes[0], last = nodes[nodes.length - 1];
  if (!first || !last) { event.preventDefault(); top.element.focus({ preventScroll: true }); return; }
  if (!inside(top, document.activeElement ?? document.body) || event.shiftKey && document.activeElement === first) {
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
function handleFocus(event: FocusEvent) {
  const top = topOverlay();
  if (top && event.target instanceof Node && !inside(top, event.target)) focusFirst(top);
}
function syncClass(scope: 'body' | 'document', name: string) {
  const node = scope === 'body' ? document.body : document.documentElement;
  const key = `${scope}:${name}`;
  const owned = [...overlays.values()].some(item => (scope === 'body' ? item.bodyClass : item.documentClass) === name);
  node.classList.toggle(name, owned || classesBefore.get(key) === true);
  if (!owned) classesBefore.delete(key);
}

export function registerOverlay(registration: OverlayRegistration): () => void {
  const releaseScroll = acquireBodyScrollLock();
  const first = overlays.size === 0;
  if (first) {
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('focusin', handleFocus, true);
    observer = new MutationObserver(updateInert);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const base = registration.level === 'confirmation' ? zIndex.confirmation : registration.level === 'navigation' ? zIndex.navigationOverlay : zIndex.modal;
  const siblings = [...overlays.values()].filter(item => item.level === registration.level);
  const layer = siblings.length ? Math.max(...siblings.map(item => item.layer)) + zIndex.overlayStep : base;
  const active: ActiveOverlay = { ...registration, restoreFocus: priorFocus, sequence: ++sequence, layer };
  overlays.set(registration.id, active);
  registration.element.style.zIndex = String(layer);
  for (const [scope, name] of [['body', registration.bodyClass], ['document', registration.documentClass]] as const) {
    if (!name) continue;
    const node = scope === 'body' ? document.body : document.documentElement;
    if (!classesBefore.has(`${scope}:${name}`)) classesBefore.set(`${scope}:${name}`, node.classList.contains(name));
    syncClass(scope, name);
  }
  updateInert();
  if (topOverlay()?.id === registration.id) focusFirst(active);
  return () => {
    const wasTop = topOverlay()?.id === registration.id;
    overlays.delete(registration.id);
    if (registration.bodyClass) syncClass('body', registration.bodyClass);
    if (registration.documentClass) syncClass('document', registration.documentClass);
    if (!overlays.size) {
      observer?.disconnect(); observer = null;
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('focusin', handleFocus, true);
      for (const [node, wasInert] of inertBefore) node.inert = wasInert;
      inertBefore.clear();
    } else updateInert();
    releaseScroll();
    if (wasTop) {
      const top = topOverlay();
      const restore = active.restoreFocus?.isConnected && visible(active.restoreFocus) ? active.restoreFocus : active.fallbackFocus?.();
      if (restore && (!top || inside(top, restore))) restore.focus({ preventScroll: true });
      else if (top) focusFirst(top);
    }
  };
}

export function overlayHost(): HTMLElement {
  let host = document.getElementById('vsf-overlay-host');
  if (!host) { host = document.createElement('div'); host.id = 'vsf-overlay-host'; document.body.appendChild(host); }
  return host;
}

/** Google's dropdown is outside React's tree; bind it to the focused input's
 * dialog so keyboard/pointer selection does not unlock the rest of the page. */
export function ownAutocompletePopup(input: HTMLElement) {
  const owner = input.closest<HTMLElement>('[data-overlay-root]');
  if (!owner) return;
  for (const popup of document.querySelectorAll<HTMLElement>('.pac-container')) {
    popup.dataset.overlayOwner = owner.id;
    popup.style.zIndex = String(zIndex.overlayControl);
    popup.inert = false;
  }
  updateInert();
}
