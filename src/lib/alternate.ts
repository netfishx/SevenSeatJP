import type { Locale } from '@/i18n/t';

export function getCanonicalUrl(currentUrl: URL, targetLocale: Locale): string {
  const path = currentUrl.pathname.replace(/^\/zh(\/|$)/, '/');
  if (targetLocale === 'zh') return path === '/' ? '/zh/' : `/zh${path}`;
  return path;
}

export function getLanguageSwitchUrl(
  currentUrl: URL,
  targetLocale: Locale,
): string {
  return getCanonicalUrl(currentUrl, targetLocale) + currentUrl.search;
}
