const KEY_FIRST = 'sevenseat_attr_first';
const KEY_LAST = 'sevenseat_attr_last';
const MAX_AGE_DAYS = 30;

// Hard caps mirror InquirySchema in src/lib/schemas/inquiry.ts so payloads
// are always shape-valid. If a marketing campaign drops a 300-char utm_term
// or the user lands on a URL with a huge query string, we still want a
// successful submission — attribution is observational, not load-bearing.
const MAX_FIELD = 200;
const MAX_REFERRER = 2000;
const MAX_LANDING = 500;

type Attr = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  referrer: string;
  landing: string;
  ts: number;
};

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* swallow */
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* swallow */
  }
}

function isAttrShape(v: unknown): v is Attr {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.source === 'string' &&
    typeof o.medium === 'string' &&
    typeof o.campaign === 'string' &&
    typeof o.content === 'string' &&
    typeof o.term === 'string' &&
    typeof o.referrer === 'string' &&
    typeof o.landing === 'string' &&
    typeof o.ts === 'number'
  );
}

function clipAttr(a: Attr): Attr {
  return {
    source: clip(a.source, MAX_FIELD),
    medium: clip(a.medium, MAX_FIELD),
    campaign: clip(a.campaign, MAX_FIELD),
    content: clip(a.content, MAX_FIELD),
    term: clip(a.term, MAX_FIELD),
    referrer: clip(a.referrer, MAX_REFERRER),
    landing: clip(a.landing, MAX_LANDING),
    ts: a.ts,
  };
}

function safeParse(raw: string): Attr | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  return isAttrShape(v) ? clipAttr(v) : null;
}

function readCurrent(): { attr: Attr; hasUtm: boolean } {
  const sp = new URLSearchParams(location.search);
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
  ] as const;
  const hasUtm = utmKeys.some((k) => sp.has(k));
  const attr: Attr = {
    source:
      sp.get('utm_source') ??
      (hasUtm ? '' : document.referrer ? 'referral' : 'direct'),
    medium: sp.get('utm_medium') ?? '',
    campaign: sp.get('utm_campaign') ?? '',
    content: sp.get('utm_content') ?? '',
    term: sp.get('utm_term') ?? '',
    referrer: document.referrer,
    landing: location.pathname + location.search,
    ts: Date.now(),
  };
  return { hasUtm, attr: clipAttr(attr) };
}

(function init() {
  const { attr, hasUtm } = readCurrent();
  if (!safeGet(sessionStorage, KEY_FIRST)) {
    safeSet(sessionStorage, KEY_FIRST, JSON.stringify(attr));
  }
  if (hasUtm) {
    safeSet(localStorage, KEY_LAST, JSON.stringify(attr));
  } else {
    // Best-effort expiry sweep. Bad-shape or unparseable rows are also dropped
    // so readAttribution() never returns ones that would fail server schema.
    const raw = safeGet(localStorage, KEY_LAST);
    if (raw) {
      const parsed = safeParse(raw);
      if (!parsed || Date.now() - parsed.ts > MAX_AGE_DAYS * 86400_000) {
        safeRemove(localStorage, KEY_LAST);
      }
    }
  }
})();

export function readAttribution(): {
  firstTouch: Attr | null;
  lastTouch: Attr | null;
  current: Attr;
} {
  const first = safeGet(sessionStorage, KEY_FIRST);
  const last = safeGet(localStorage, KEY_LAST);
  return {
    firstTouch: first ? safeParse(first) : null,
    lastTouch: last ? safeParse(last) : null,
    current: readCurrent().attr,
  };
}
