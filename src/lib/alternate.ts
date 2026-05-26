import { getRelativeLocaleUrl } from 'astro:i18n';
import type { Locale } from '@/i18n/t';

function getPathWithoutLocale(currentUrl: URL): string {
  return currentUrl.pathname.replace(/^\/zh(\/|$)/, '/').replace(/^\/+/, '');
}

export function getCanonicalUrl(currentUrl: URL, targetLocale: Locale): string {
  const pathWithoutLocale = getPathWithoutLocale(currentUrl);
  const url = getRelativeLocaleUrl(targetLocale, pathWithoutLocale);
  return pathWithoutLocale === '' ? url : url.replace(/\/$/, '');
}

export function getLanguageSwitchUrl(
  currentUrl: URL,
  targetLocale: Locale,
): string {
  return getCanonicalUrl(currentUrl, targetLocale) + currentUrl.search;
}
