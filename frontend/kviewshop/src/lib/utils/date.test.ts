import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateDDay,
  calculateDDayUntilStart,
  getDDayLabel,
  getDDayStartLabel,
  formatCampaignPeriod,
  hasCampaignStarted,
  getTimeRemaining,
  calculateDiscountRate,
} from './date';

describe('calculateDDay', () => {
  it('null/undefined 입력 시 -1 반환', () => {
    expect(calculateDDay(null)).toBe(-1);
    expect(calculateDDay(undefined)).toBe(-1);
  });

  it('이미 지난 날짜는 0 반환', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(calculateDDay(past)).toBe(0);
  });

  it('미래 날짜는 남은 일수 반환 (Math.ceil)', () => {
    // 36시간 후 → 2일 (Math.ceil)
    const future = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
    expect(calculateDDay(future)).toBe(2);
  });

  it('정확히 24시간 후는 1일', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(calculateDDay(future)).toBe(1);
  });
});

describe('getDDayLabel', () => {
  it('음수 → 빈 문자열', () => {
    expect(getDDayLabel(-1)).toBe('');
  });

  it('0 → D-Day', () => {
    expect(getDDayLabel(0)).toBe('D-Day');
  });

  it('양수 → D-N 형식', () => {
    expect(getDDayLabel(3)).toBe('D-3');
    expect(getDDayLabel(10)).toBe('D-10');
  });
});

describe('getDDayStartLabel', () => {
  it('0 이하 → 빈 문자열', () => {
    expect(getDDayStartLabel(0)).toBe('');
    expect(getDDayStartLabel(-1)).toBe('');
  });

  it('양수 → D-N 오픈 예정', () => {
    expect(getDDayStartLabel(5)).toBe('D-5 오픈 예정');
  });
});

describe('formatCampaignPeriod', () => {
  it('둘 다 없으면 빈 문자열', () => {
    expect(formatCampaignPeriod(null, null)).toBe('');
  });

  it('시작/종료 모두 있으면 M/D ~ M/D 형식', () => {
    const result = formatCampaignPeriod('2026-03-15', '2026-03-20');
    expect(result).toBe('3/15 ~ 3/20');
  });

  it('시작만 있으면 M/D ~', () => {
    const result = formatCampaignPeriod('2026-06-01', null);
    expect(result).toBe('6/1 ~');
  });

  it('종료만 있으면 ~ M/D', () => {
    const result = formatCampaignPeriod(null, '2026-12-25');
    expect(result).toBe('~ 12/25');
  });
});

describe('hasCampaignStarted', () => {
  it('startAt 없으면 true (이미 시작)', () => {
    expect(hasCampaignStarted(null)).toBe(true);
    expect(hasCampaignStarted(undefined)).toBe(true);
  });

  it('과거 날짜는 true', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(hasCampaignStarted(past)).toBe(true);
  });

  it('미래 날짜는 false', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(hasCampaignStarted(future)).toBe(false);
  });
});

describe('getTimeRemaining', () => {
  it('이미 지난 시간은 모두 0', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const result = getTimeRemaining(past);
    expect(result.total).toBe(0);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
  });

  it('미래 시간은 올바른 분해', () => {
    // 25시간 30분 후
    const future = new Date(Date.now() + (25 * 60 + 30) * 60 * 1000).toISOString();
    const result = getTimeRemaining(future);
    expect(result.days).toBe(1);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(30);
    expect(result.total).toBeGreaterThan(0);
  });
});

describe('calculateDiscountRate', () => {
  it('원가 0이면 0% 반환', () => {
    expect(calculateDiscountRate(0, 5000)).toBe(0);
  });

  it('할인율 올바르게 계산', () => {
    expect(calculateDiscountRate(10000, 7000)).toBe(30);
    expect(calculateDiscountRate(50000, 25000)).toBe(50);
  });

  it('반올림 처리', () => {
    expect(calculateDiscountRate(30000, 19900)).toBe(34); // 33.67 → 34
  });
});
