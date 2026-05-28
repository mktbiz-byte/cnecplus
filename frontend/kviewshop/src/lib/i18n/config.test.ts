import { describe, it, expect } from 'vitest';
import {
  locales,
  defaultLocale,
  getLocaleFromPathname,
  isValidLocale,
  isRTL,
  formatCurrency,
  getLocaleIntl,
} from './config';

describe('locales', () => {
  it('11개 언어 지원', () => {
    expect(locales).toHaveLength(11);
    expect(locales).toContain('ko');
    expect(locales).toContain('en');
    expect(locales).toContain('ja');
    expect(locales).toContain('ar');
  });

  it('기본 locale은 en', () => {
    expect(defaultLocale).toBe('en');
  });
});

describe('getLocaleFromPathname', () => {
  it('경로에서 locale 추출', () => {
    expect(getLocaleFromPathname('/ko/products')).toBe('ko');
    expect(getLocaleFromPathname('/en/search')).toBe('en');
    expect(getLocaleFromPathname('/ja')).toBe('ja');
  });

  it('잘못된 locale은 기본값 반환', () => {
    expect(getLocaleFromPathname('/xx/products')).toBe('en');
    expect(getLocaleFromPathname('/')).toBe('en');
  });
});

describe('isValidLocale', () => {
  it('유효한 locale은 true', () => {
    expect(isValidLocale('ko')).toBe(true);
    expect(isValidLocale('en')).toBe(true);
  });

  it('무효한 locale은 false', () => {
    expect(isValidLocale('xx')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });
});

describe('isRTL', () => {
  it('아랍어만 RTL', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ko')).toBe(false);
    expect(isRTL('en')).toBe(false);
  });
});

describe('getLocaleIntl', () => {
  it('올바른 Intl locale 반환', () => {
    expect(getLocaleIntl('ko')).toBe('ko-KR');
    expect(getLocaleIntl('en')).toBe('en-US');
    expect(getLocaleIntl('ja')).toBe('ja-JP');
  });
});

describe('formatCurrency', () => {
  it('KRW 포맷', () => {
    const result = formatCurrency(15000, 'KRW');
    expect(result).toContain('15,000');
  });

  it('USD 포맷', () => {
    const result = formatCurrency(99.99, 'USD');
    expect(result).toContain('99.99');
  });

  it('JPY 소수점 없음', () => {
    const result = formatCurrency(1500, 'JPY');
    expect(result).toContain('1,500');
    expect(result).not.toContain('.');
  });
});
