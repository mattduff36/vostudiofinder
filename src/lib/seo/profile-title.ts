/**
 * Profile page meta title builder
 *
 * Goal: produce a human-readable, Google-friendly title capped at 60 characters.
 * Preferred format:
 *   {Studio Name} – {Primary Studio Type} in {Town/City}
 */

const MAX_TITLE_LENGTH = 60;

const STUDIO_TYPE_LABELS: Record<string, { full: string; short: string }> = {
  HOME: { full: 'Home Studio', short: 'Home' },
  RECORDING: { full: 'Recording Studio', short: 'Recording' },
  PODCAST: { full: 'Podcast Studio', short: 'Podcast' },
  AUDIO_PRODUCER: { full: 'Audio Producer', short: 'Producer' },
  VO_COACH: { full: 'VO Coach', short: 'VO Coach' },
  VOICEOVER: { full: 'Voiceover Artist', short: 'VO Artist' },
};

function compactWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function stripParentheticals(input: string): string {
  // Remove (...) and [...] blocks (often secondary name elements)
  return compactWhitespace(input.replace(/\s*[(\[].*?[)\]]\s*/g, ' ').trim());
}

function takeBeforeDelimiters(input: string): string {
  // Remove secondary name elements, e.g. "Foo Studio - London" -> "Foo Studio"
  const parts = input.split(/\s+(?:-+|–|\||:)\s+/);
  return compactWhitespace((parts[0] ?? input).trim());
}

function stripTrailingCompanySuffixes(input: string): string {
  // Light-touch: only remove common legal suffixes if they appear at the end.
  return compactWhitespace(
    input.replace(/\s+(ltd\.?|limited|llc|inc\.?|co\.?|company)\s*$/i, '').trim()
  );
}

function stripTrailingGenericWords(input: string): string {
  // Used only as a shortening step when needed.
  return compactWhitespace(
    input
      .replace(/\s+(recording\s+studio|studio|studios)\s*$/i, '')
      .trim()
  );
}

function titleLength(s: string): number {
  // JS length is OK here (titles are ASCII-ish); keep it simple.
  return s.length;
}

function containsWord(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

function trimNameToFit(name: string, suffix: string, maxLen: number): string {
  const available = maxLen - titleLength(suffix);
  if (available <= 0) return '';
  if (titleLength(name) <= available) return name;

  const words = compactWhitespace(name).split(' ');
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (titleLength(next) > available) break;
    out = next;
  }

  // If we couldn't fit even one word (very rare), hard cut at boundary.
  if (!out) return name.slice(0, Math.max(0, available)).trim();
  return out;
}

export function toStudioTypeLabel(studioType?: string | null): { full?: string; short?: string } {
  if (!studioType) return {};
  const key = studioType.toUpperCase();
  return STUDIO_TYPE_LABELS[key] ?? { full: studioType, short: studioType };
}

export function buildProfileMetaTitle(input: {
  studioName: string;
  primaryStudioType?: string | null;
  city?: string | null;
}): string {
  const rawName = compactWhitespace(input.studioName || '');
  const rawCity = compactWhitespace(input.city || '');

  const { full: typeFull, short: typeShort } = toStudioTypeLabel(input.primaryStudioType);
  const primaryTypeFull = compactWhitespace(typeFull || 'Recording Studio');
  const primaryTypeShort = compactWhitespace(typeShort || primaryTypeFull);

  // Start with preferred format.
  let name = stripTrailingCompanySuffixes(rawName);
  let city = rawCity;
  let type = primaryTypeFull;

  // Avoid duplicate location words (e.g. "London Voice Studio" ... "in London")
  if (city && containsWord(name, city)) {
    city = '';
  }

  const build = (n: string, t: string, c: string) => {
    const n2 = compactWhitespace(n);
    const t2 = compactWhitespace(t);
    const c2 = compactWhitespace(c);
    if (c2) return `${n2} – ${t2} in ${c2}`;
    return `${n2} – ${t2}`;
  };

  let title = build(name, type, city);

  if (titleLength(title) <= MAX_TITLE_LENGTH) return title;

  // Shortening steps (in the priority order you requested).
  name = stripParentheticals(name);
  title = build(name, type, city);
  if (titleLength(title) <= MAX_TITLE_LENGTH) return title;

  name = takeBeforeDelimiters(name);
  title = build(name, type, city);
  if (titleLength(title) <= MAX_TITLE_LENGTH) return title;

  // Shorten studio type label
  type = primaryTypeShort;
  title = build(name, type, city);
  if (titleLength(title) <= MAX_TITLE_LENGTH) return title;

  // Avoid duplicate location words (again) after shortening.
  if (city && (containsWord(name, city) || containsWord(type, city))) {
    city = '';
    title = build(name, type, city);
    if (titleLength(title) <= MAX_TITLE_LENGTH) return title;
  }

  // If still long, try removing generic trailing words from name.
  name = stripTrailingGenericWords(name);
  title = build(name, type, city);
  if (titleLength(title) <= MAX_TITLE_LENGTH) return title;

  // Final fallback: trim the name to fit without breaking the rest.
  const suffix = city ? ` – ${type} in ${city}` : ` – ${type}`;
  const trimmedName = trimNameToFit(name, suffix, MAX_TITLE_LENGTH);
  return build(trimmedName || name, type, city).slice(0, MAX_TITLE_LENGTH).trim();
}

