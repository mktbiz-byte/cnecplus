import { locales, type Locale } from '@/lib/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

/**
 * 주어진 경로에 대해 모든 locale의 hreflang alternates를 생성
 * @param path locale prefix를 제외한 경로 (예: "/brands/abc123")
 */
export function buildHreflangAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  // x-default → 기본 locale (en)
  languages['x-default'] = `${BASE_URL}/en${path}`;
  return languages;
}

/**
 * locale별 OG locale 맵
 */
const ogLocaleMap: Record<Locale, string> = {
  en: 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  es: 'es_ES',
  it: 'it_IT',
  ru: 'ru_RU',
  ar: 'ar_AE',
  zh: 'zh_CN',
  fr: 'fr_FR',
  pt: 'pt_BR',
  de: 'de_DE',
};

export function getOgLocale(locale: string): string {
  return ogLocaleMap[locale as Locale] || 'en_US';
}

export function getOgAlternateLocales(currentLocale: string): string[] {
  return Object.entries(ogLocaleMap)
    .filter(([loc]) => loc !== currentLocale)
    .map(([, ogLoc]) => ogLoc);
}
