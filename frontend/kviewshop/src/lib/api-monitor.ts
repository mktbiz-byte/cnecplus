import { NextRequest, NextResponse } from 'next/server';

const SLOW_THRESHOLD_MS = 3000;

/**
 * API 라우트 래퍼: 응답 시간 측정 + 에러 로깅
 *
 * Usage:
 * ```ts
 * export const GET = withMonitoring('GET /api/search', async (req) => { ... });
 * ```
 */
export function withMonitoring(
  routeName: string,
  handler: (req: NextRequest) => Promise<NextResponse | Response>,
) {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    const start = performance.now();
    let status = 200;

    try {
      const response = await handler(req);
      status = response.status;
      return response;
    } catch (error) {
      status = 500;
      console.error(`[API Error] ${routeName}`, {
        error: error instanceof Error ? error.message : 'Unknown',
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    } finally {
      const duration = Math.round(performance.now() - start);

      if (duration > SLOW_THRESHOLD_MS) {
        console.warn(`[Slow API] ${routeName} took ${duration}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`, {
          url: req.nextUrl.pathname,
          status,
          duration,
        });
      }

      // Production에서만 모든 요청 로깅 (dev에서는 느린 것만)
      if (process.env.NODE_ENV === 'production') {
        console.log(`[API] ${routeName} ${status} ${duration}ms`);
      }
    }
  };
}

/**
 * 데이터베이스 쿼리 시간 측정
 */
export async function measureQuery<T>(
  label: string,
  queryFn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = Math.round(performance.now() - start);
    if (duration > 1000) {
      console.warn(`[Slow Query] ${label}: ${duration}ms`);
    }
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error(`[Query Error] ${label}: ${duration}ms`, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}
