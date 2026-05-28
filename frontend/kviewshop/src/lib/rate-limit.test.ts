import { describe, it, expect } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  it('제한 내 요청은 false 반환', async () => {
    const result = await rateLimit('test-ok-1', 5, 60);
    expect(result).toBe(false);
  });

  it('제한 초과 시 true 반환', async () => {
    const key = 'test-exceed-' + Date.now();
    // 3번 제한
    await rateLimit(key, 3, 60);
    await rateLimit(key, 3, 60);
    await rateLimit(key, 3, 60);
    // 4번째 → 초과
    const result = await rateLimit(key, 3, 60);
    expect(result).toBe(true);
  });

  it('다른 키는 독립적', async () => {
    const key1 = 'test-a-' + Date.now();
    const key2 = 'test-b-' + Date.now();
    await rateLimit(key1, 1, 60);
    // key1은 초과
    expect(await rateLimit(key1, 1, 60)).toBe(true);
    // key2는 아직 0
    expect(await rateLimit(key2, 1, 60)).toBe(false);
  });
});
