import type { Locale } from '@/i18n/t';

export function localePrefix(locale: Locale): string {
  return locale === 'zh' ? '/zh' : '';
}

export function inquiryHref(locale: Locale): string {
  return locale === 'zh' ? '/zh/inquiry' : '/inquiry';
}
