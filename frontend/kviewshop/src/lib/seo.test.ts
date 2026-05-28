import { describe, it, expect } from 'vitest';
import { buildHreflangAlternates, getOgLocale, getOgAlternateLocales } from './seo';

describe('buildHreflangAlternates', () => {
  it('모든 locale에 대해 URL 생성', () => {
    const result = buildHreflangAlternates('/brands/abc');
    expect(result.ko).toBe('https://www.cnecshop.com/ko/brands/abc');
    expect(result.en).toBe('https://www.cnecshop.com/en/brands/abc');
    expect(result.ja).toBe('https://www.cnecshop.com/ja/brands/abc');
    expect(result['x-default']).toBe('https://www.cnecshop.com/en/brands/abc');
  });

  it('11개 언어 + x-default = 12개 항목', () => {
    const result = buildHreflangAlternates('/test');
    expect(Object.keys(result)).toHaveLength(12);
  });

  it('루트 경로 처리', () => {
    const result = buildHreflangAlternates('/');
    expect(result.ko).toBe('https://www.cnecshop.com/ko/');
  });
});

describe('getOgLocale', () => {
  it('한국어 → ko_KR', () => {
    expect(getOgLocale('ko')).toBe('ko_KR');
  });

  it('영어 → en_US', () => {
    expect(getOgLocale('en')).toBe('en_US');
  });

  it('알 수 없는 locale → en_US 폴백', () => {
    expect(getOgLocale('xx')).toBe('en_US');
  });
});

describe('getOgAlternateLocales', () => {
  it('현재 locale 제외하고 반환', () => {
    const result = getOgAlternateLocales('ko');
    expect(result).not.toContain('ko_KR');
    expect(result).toContain('en_US');
    expect(result).toContain('ja_JP');
    expect(result).toHaveLength(10);
  });
});
