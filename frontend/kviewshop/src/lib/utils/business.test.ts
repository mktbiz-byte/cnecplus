import { describe, it, expect } from 'vitest';
import { calculateEarnings, formatEarnings } from './beauty-labels';
import { formatFollowerCount } from './format';
import { getTrackingUrl, getCourierLabel } from './courier';

// ─── 커미션 계산 ───
describe('calculateEarnings (커미션 계산)', () => {
  it('기본 커미션 계산', () => {
    // 10,000원 * 10% = 1,000원
    expect(calculateEarnings(10000, 0.1)).toBe(1000);
  });

  it('Decimal 타입 처리 (Prisma)', () => {
    // Prisma Decimal은 toString()을 가진 객체
    const price = { toString: () => '25000' };
    const rate = { toString: () => '0.08' };
    expect(calculateEarnings(price, rate)).toBe(2000);
  });

  it('0원 상품은 0원 커미션', () => {
    expect(calculateEarnings(0, 0.1)).toBe(0);
  });

  it('반올림 처리', () => {
    // 33,333원 * 10% = 3333.3 → 3333
    expect(calculateEarnings(33333, 0.1)).toBe(3333);
  });

  it('PRO 플랜 8% 커미션', () => {
    expect(calculateEarnings(50000, 0.08)).toBe(4000);
  });
});

describe('formatEarnings', () => {
  it('포맷된 문자열 반환', () => {
    const result = formatEarnings(15000, 0.1);
    expect(result).toBe('팔면 ₩1,500');
  });
});

// ─── 팔로워 수 포맷 ───
describe('formatFollowerCount', () => {
  it('1000 미만은 그대로', () => {
    expect(formatFollowerCount(999)).toBe('999');
    expect(formatFollowerCount(0)).toBe('0');
  });

  it('1K~999K 범위', () => {
    expect(formatFollowerCount(1000)).toBe('1K');
    expect(formatFollowerCount(1500)).toBe('1.5K');
    expect(formatFollowerCount(15000)).toBe('15K');
    expect(formatFollowerCount(999000)).toBe('999K');
  });

  it('1M 이상', () => {
    expect(formatFollowerCount(1000000)).toBe('1M');
    expect(formatFollowerCount(2500000)).toBe('2.5M');
    expect(formatFollowerCount(10000000)).toBe('10M');
  });

  it('.0 제거', () => {
    expect(formatFollowerCount(5000)).toBe('5K');
    expect(formatFollowerCount(3000000)).toBe('3M');
  });
});

// ─── 택배사 ───
describe('getTrackingUrl', () => {
  it('CJ대한통운 추적 URL 생성', () => {
    const url = getTrackingUrl('cj', '1234567890');
    expect(url).toBe('https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890');
  });

  it('null 입력 시 null', () => {
    expect(getTrackingUrl(null, '123')).toBeNull();
    expect(getTrackingUrl('cj', null)).toBeNull();
    expect(getTrackingUrl(null, null)).toBeNull();
  });

  it('알 수 없는 택배사는 null', () => {
    expect(getTrackingUrl('unknown', '123')).toBeNull();
  });
});

describe('getCourierLabel', () => {
  it('코드 → 이름 변환', () => {
    expect(getCourierLabel('cj')).toBe('CJ대한통운');
    expect(getCourierLabel('hanjin')).toBe('한진택배');
    expect(getCourierLabel('logen')).toBe('로젠택배');
  });

  it('null → 대시', () => {
    expect(getCourierLabel(null)).toBe('-');
  });

  it('알 수 없는 코드는 그대로 반환', () => {
    expect(getCourierLabel('fedex')).toBe('fedex');
  });
});
