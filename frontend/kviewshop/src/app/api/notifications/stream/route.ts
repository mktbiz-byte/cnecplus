import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

// Vercel serverless 타임아웃 전에 연결 종료 (클라이언트가 재연결)
const MAX_STREAM_DURATION_MS = 25_000;
const POLL_INTERVAL_MS = 5_000;

/**
 * SSE 엔드포인트: 실시간 알림 스트림
 * - 5초마다 DB 변경 감지
 * - 25초 후 자동 종료 (Vercel 타임아웃 대응)
 * - 클라이언트 EventSource가 자동 재연결 (retry: 3000)
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = authUser.id;
  let lastUnreadCount = -1;
  let lastNotificationId = '';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      // retry 간격 설정 (클라이언트 재연결 시 3초 대기)
      controller.enqueue(encoder.encode('retry: 3000\n\n'));

      // 초기 데이터 즉시 전송
      try {
        const { unreadCount, latestId } = await getNotificationState(userId);
        lastUnreadCount = unreadCount;
        lastNotificationId = latestId;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', unreadCount })}\n\n`),
        );
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', unreadCount: 0 })}\n\n`),
        );
      }

      const interval = setInterval(async () => {
        // 타임아웃 도달 시 스트림 종료 → 클라이언트가 자동 재연결
        if (Date.now() - startTime > MAX_STREAM_DURATION_MS) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        try {
          const { unreadCount, latestId, latestNotification } = await getNotificationState(userId);

          if (unreadCount !== lastUnreadCount || latestId !== lastNotificationId) {
            const isNewNotification = latestId !== lastNotificationId && latestId !== '';
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: isNewNotification ? 'new' : 'update',
                  unreadCount,
                  notification: isNewNotification ? latestNotification : undefined,
                })}\n\n`,
              ),
            );
            lastUnreadCount = unreadCount;
            lastNotificationId = latestId;
          } else {
            // 변경 없어도 keepalive ping (연결 유지)
            controller.enqueue(encoder.encode(': ping\n\n'));
          }
        } catch {
          // DB 오류 시 keepalive만 전송
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch { /* stream closed */ }
        }
      }, POLL_INTERVAL_MS);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function getNotificationState(userId: string) {
  const [unreadCount, latest] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, message: true, type: true, linkUrl: true, createdAt: true },
    }),
  ]);

  return {
    unreadCount,
    latestId: latest?.id || '',
    latestNotification: latest
      ? { id: latest.id, title: latest.title, message: latest.message, type: latest.type, linkUrl: latest.linkUrl, createdAt: latest.createdAt }
      : undefined,
  };
}
