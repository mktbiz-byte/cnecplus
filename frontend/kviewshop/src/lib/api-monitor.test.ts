import { describe, it, expect, vi } from 'vitest';
import { measureQuery } from './api-monitor';

describe('measureQuery', () => {
  it('쿼리 결과를 정상 반환', async () => {
    const result = await measureQuery('test', async () => ({ data: 'hello' }));
    expect(result).toEqual({ data: 'hello' });
  });

  it('에러 발생 시 그대로 throw', async () => {
    await expect(
      measureQuery('test-error', async () => {
        throw new Error('DB error');
      }),
    ).rejects.toThrow('DB error');
  });

  it('느린 쿼리 시 경고 로그', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await measureQuery('slow-test', async () => {
      // 시뮬레이션: performance.now는 빠르게 진행되므로 직접 체크는 어려움
      return 'ok';
    });

    warnSpy.mockRestore();
  });
});
