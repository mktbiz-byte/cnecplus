'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bell, ShoppingCart, Truck, DollarSign, Megaphone, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import type { NotificationType } from '@/types/database';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

const mockNotifications: NotificationItem[] = [
  {
    id: 'mock-1',
    type: 'ORDER',
    title: '새 주문 발생',
    message: '뷰티진 샵에서 하우파파 로션 1건이 판매되었습니다. 예상 수익: ₩3,705',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'mock-2',
    type: 'CAMPAIGN',
    title: '공구 승인',
    message: '누씨오 특가전 캠페인 참여가 승인되었습니다.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'mock-3',
    type: 'SETTLEMENT',
    title: '정산 예정 안내',
    message: '1월 정산금 ₩45,200이 2월 20일에 지급됩니다.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-4',
    type: 'SHIPPING',
    title: '배송 완료',
    message: '주문 CNEC-20260210-12345의 배송이 완료되었습니다.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'mock-5',
    type: 'SYSTEM',
    title: '시스템 공지',
    message: 'CNEC Commerce v1.1이 업데이트되었습니다.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ORDER':
      return ShoppingCart;
    case 'SHIPPING':
      return Truck;
    case 'SETTLEMENT':
      return DollarSign;
    case 'CAMPAIGN':
      return Megaphone;
    case 'SYSTEM':
    default:
      return Info;
  }
}

function getNotificationColor(type: NotificationType) {
  switch (type) {
    case 'ORDER':
      return 'text-blue-500 bg-blue-500/10';
    case 'SHIPPING':
      return 'text-purple-500 bg-purple-500/10';
    case 'SETTLEMENT':
      return 'text-green-500 bg-green-500/10';
    case 'CAMPAIGN':
      return 'text-orange-500 bg-orange-500/10';
    case 'SYSTEM':
    default:
      return 'text-gray-500 bg-gray-500/10';
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function NotificationBell() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ko';
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      // Use mock data when no user is logged in
      setNotifications(mockNotifications.slice(0, 10));
      setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
      return;
    }

    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNotifications((data.notifications || []).slice(0, 10));
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Fallback to mock data on error
      setNotifications(mockNotifications.slice(0, 10));
      setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
    }
  }, [user?.id]);

  // SSE 실시간 연결 + 폴백 폴링
  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    // SSE 연결
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setUnreadCount(data.unreadCount ?? 0);

          // 새 알림이 도착하면 목록도 갱신
          if (data.type === 'new') {
            fetchNotifications();
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        // SSE 실패 시 폴백: 30초 폴링
        eventSource?.close();
        eventSource = null;
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchNotifications, 30000);
        }
      };
    } catch {
      // EventSource 미지원 → 폴백
      fallbackInterval = setInterval(fetchNotifications, 30000);
    }

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [fetchNotifications, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleMarkAllRead = async () => {
    if (!user?.id) {
      // Mock mode: mark all as read locally
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      return;
    }

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: user.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      console.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read
    if (!notification.isRead) {
      if (user?.id) {
        try {
          await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: notification.id }),
          });
        } catch {
          console.error('Failed to mark notification as read');
        }
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // 드롭다운 먼저 닫기
    setIsOpen(false);

    // linkUrl이 있으면 이동 — 로케일 prefix가 없으면 추가
    if (notification.linkUrl) {
      let target = notification.linkUrl;
      // 절대 URL(http://)이 아니고, 로케일 prefix가 없으면 추가
      if (!/^https?:\/\//i.test(target)) {
        // "/" 로 시작하지 않으면 보정
        if (!target.startsWith('/')) target = `/${target}`;
        // 이미 /{locale}/ 로 시작하는지 확인
        const hasLocalePrefix = /^\/(ko|en|ja|zh|es|it|ru|ar|fr|pt|de)(\/|$)/.test(target);
        if (!hasLocalePrefix) {
          target = `/${locale}${target}`;
        }
      }
      router.push(target);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="icon" onClick={toggleOpen} className="h-8 w-8 p-0">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">알림</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount}개 읽지 않음
              </span>
            )}
          </div>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2">
              <button
                onClick={handleMarkAllRead}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
              >
                <Check className="h-3 w-3" />
                모두 읽음으로 표시
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
