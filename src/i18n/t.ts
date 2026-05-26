import ja from './ja.json';
import zh from './zh.json';

const _zhComplete = zh satisfies Record<keyof typeof ja, string>;
void _zhComplete;

const dict = { ja, zh } as const;
export type Locale = keyof typeof dict;
export type I18nKey = keyof typeof ja;

export function t(locale: Locale, key: I18nKey): string {
  return dict[locale][key];
}

export function getLocaleFromUrl(url: URL): Locale {
  const p = url.pathname;
  return p === '/zh' || p.startsWith('/zh/') ? 'zh' : 'ja';
}
