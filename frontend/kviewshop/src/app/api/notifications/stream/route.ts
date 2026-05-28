import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

/**
 * SSE 엔드포인트: 실시간 알림 스트림
 * 5초마다 DB에서 미읽은 알림 수를 확인하여 변경 시 이벤트 전송
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
      // 초기 데이터 즉시 전송
      try {
        const { unreadCount, latestId } = await getNotificationState(userId);
        lastUnreadCount = unreadCount;
        lastNotificationId = latestId;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', unreadCount })}\n\n`),
        );
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'init', unreadCount: 0 })}\n\n`));
      }

      // 5초 간격으로 폴링하여 변경 사항 감지
      const interval = setInterval(async () => {
        try {
          const { unreadCount, latestId, latestNotification } = await getNotificationState(userId);

          // 새 알림이 생겼거나 읽음 상태가 변경된 경우만 이벤트 전송
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
          }
        } catch {
          // DB 연결 실패 등 — 무시하고 다음 폴링 대기
        }
      }, 5000);

      // 클라이언트 연결 해제 시 정리
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
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
      ? {
          id: latest.id,
          title: latest.title,
          message: latest.message,
          type: latest.type,
          linkUrl: latest.linkUrl,
          createdAt: latest.createdAt,
        }
      : undefined,
  };
}
