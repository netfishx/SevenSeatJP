const KEY_FIRST = 'sevenseat_attr_first';
const KEY_LAST = 'sevenseat_attr_last';
const MAX_AGE_DAYS = 30;

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

function safeParse(s: string): Attr | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
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
  return {
    hasUtm,
    attr: {
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
    },
  };
}

(function init() {
  const { attr, hasUtm } = readCurrent();
  if (!safeGet(sessionStorage, KEY_FIRST)) {
    safeSet(sessionStorage, KEY_FIRST, JSON.stringify(attr));
  }
  if (hasUtm) {
    safeSet(localStorage, KEY_LAST, JSON.stringify(attr));
  } else {
    const raw = safeGet(localStorage, KEY_LAST);
    if (raw) {
      try {
        const last = JSON.parse(raw) as Attr;
        if (Date.now() - last.ts > MAX_AGE_DAYS * 86400_000) {
          safeRemove(localStorage, KEY_LAST);
        }
      } catch {
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
