export const REDACTED = '[REDACTED]';

const MAX_DEPTH = 16;

const SENSITIVE_KEY =
  /password|secret|token|credential|cookie|session|authorization|authentication|csrf|api[-_]?key|(?:^|[-_])(?:key|auth)(?:$|[-_])/i;

const URL_FIELD = /(?:^|[._-])(?:url|uri)$/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

function isUrlField(key: string): boolean {
  return URL_FIELD.test(key);
}

function redactQueryString(query: string): string {
  return query
    .split('&')
    .map((part) => {
      if (!part) return part;
      const eq = part.indexOf('=');
      const rawName = eq === -1 ? part : part.slice(0, eq);
      let name = rawName;
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, ' '));
      } catch {
        name = rawName;
      }
      if (!isSensitiveKey(name)) return part;
      return eq === -1 ? part : `${rawName}=${REDACTED}`;
    })
    .join('&');
}

export function redactSensitiveQueryInUrl(input: string): string {
  const safe = input.replace(/^(https?:\/\/)[^/?#]*@/i, `$1${REDACTED}@`);
  const hashIndex = safe.indexOf('#');
  const fragment = hashIndex === -1 ? '' : safe.slice(hashIndex + 1);
  const fragmentQuery = fragment.indexOf('?');
  const hash = hashIndex === -1 ? '' : `#${fragmentQuery < 0 ? redactQueryString(fragment) : fragment.slice(0, fragmentQuery + 1) + redactQueryString(fragment.slice(fragmentQuery + 1))}`;
  const withoutHash = hashIndex === -1 ? safe : safe.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex === -1) return `${withoutHash}${hash}`;
  return `${withoutHash.slice(0, queryIndex)}?${redactQueryString(withoutHash.slice(queryIndex + 1))}${hash}`;
}

function redactHeaders(headers: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  const headerValue = (value: unknown): unknown => typeof value === 'string'
    ? redactSensitiveQueryInUrl(value) : redactNode(value, 'headers', depth + 1);
  if (Array.isArray(headers)) {
    return headers.map(pair => Array.isArray(pair) && typeof pair[0] === 'string'
      ? [pair[0], isSensitiveKey(pair[0]) ? REDACTED : headerValue(pair[1])]
      : redactNode(pair, 'headers', depth + 1));
  }
  if (headers && typeof headers === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      output[key] = isSensitiveKey(key) ? REDACTED : headerValue(value);
    }
    return output;
  }
  return headers;
}

function redactQuery(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return redactQueryString(value);
  if (Array.isArray(value)) {
    return value.map((pair) => {
      if (Array.isArray(pair) && typeof pair[0] === 'string' && isSensitiveKey(pair[0])) {
        return [pair[0], REDACTED];
      }
      return redactNode(pair, 'query_string', depth + 1);
    });
  }
  if (value && typeof value === 'object') return redactNode(value, 'query_string', depth);
  return value;
}

function redactFormBody(raw: string): string | undefined {
  if (!raw.includes('=') || /\s/.test(raw)) return undefined;
  const parts = raw.split('&');
  if (parts.some((part) => !/^[A-Za-z0-9._~%+-]+=/.test(part))) return undefined;
  return parts
    .map((part) => {
      const eq = part.indexOf('=');
      const rawName = part.slice(0, eq);
      let name = rawName;
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, ' '));
      } catch {
        name = rawName;
      }
      return isSensitiveKey(name) ? `${rawName}=${REDACTED}` : part;
    })
    .join('&');
}

/** Structured objects/JSON/form bodies are redacted. Anything else is omitted. */
function redactStructuredBody(data: unknown, depth: number): unknown {
  if (data == null) return data;
  if (typeof data === 'object') return redactNode(data, 'body', depth);
  if (typeof data !== 'string') return undefined;

  const trimmed = data.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') return redactNode(parsed, 'body', depth);
      return undefined;
    } catch {
      return undefined;
    }
  }

  return redactFormBody(trimmed);
}

function redactNode(value: unknown, parentKey: string | null, depth: number): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) {
    return value.map((item) => redactNode(item, parentKey, depth + 1));
  }
  if (!value || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const child = source[key];

    if (key === 'headers') {
      output[key] = redactHeaders(child, depth + 1);
      continue;
    }
    if (key === 'cookies' || key === 'cookie') {
      output[key] = REDACTED;
      continue;
    }
    if (key === 'query_string' || key === 'queryString') {
      output[key] = redactQuery(child, depth + 1);
      continue;
    }
    if ((key === 'data' || key === 'body') && parentKey === 'request') {
      const body = redactStructuredBody(child, depth + 1);
      if (body !== undefined) output[key] = body;
      continue;
    }
    if (isSensitiveKey(key)) {
      output[key] = REDACTED;
      continue;
    }
    if (typeof child === 'string' && isUrlField(key)) {
      output[key] = redactSensitiveQueryInUrl(child);
      continue;
    }

    output[key] = redactNode(child, key, depth + 1);
  }

  return output;
}

export function redactSentryEvent<T>(event: T): T {
  return redactNode(event, null, 0) as T;
}
