'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/use-user';
import {
  ChevronLeft, Bell, Loader2, Settings as SettingsIcon,
  ShoppingCart, Truck, DollarSign, Megaphone, Info, Check, Inbox,
} from 'lucide-react';

// ─── Types ───
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotifSettings {
  kakaoOrder: boolean;
  kakaoShipping: boolean;
  kakaoDeliver: boolean;
  kakaoGonggu: boolean;
  emailOrder: boolean;
  emailShipping: boolean;
  emailDeliver: boolean;
  emailGonggu: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
  kakaoOrder: true, kakaoShipping: true, kakaoDeliver: true, kakaoGonggu: true,
  emailOrder: true, emailShipping: true, emailDeliver: true, emailGonggu: true,
};

const SETTING_LABELS: Record<string, string> = {
  kakaoOrder: '주문 알림', kakaoShipping: '배송 알림',
  kakaoDeliver: '배달완료 알림', kakaoGonggu: '공구 알림',
  emailOrder: '주문 알림', emailShipping: '배송 알림',
  emailDeliver: '배달완료 알림', emailGonggu: '공구 알림',
};

// ─── Helpers ───
function getIcon(type: string) {
  switch (type) {
    case 'ORDER': return ShoppingCart;
    case 'SHIPPING': return Truck;
    case 'SETTLEMENT': return DollarSign;
    case 'CAMPAIGN': return Megaphone;
    default: return Info;
  }
}

function getColor(type: string) {
  switch (type) {
    case 'ORDER': return 'text-blue-500 bg-blue-500/10';
    case 'SHIPPING': return 'text-purple-500 bg-purple-500/10';
    case 'SETTLEMENT': return 'text-green-500 bg-green-500/10';
    case 'CAMPAIGN': return 'text-orange-500 bg-orange-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── Main Component ───
export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user, buyer } = useUser();

  const [tab, setTab] = useState<'inbox' | 'settings'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) { setIsLoading(false); return; }
    fetch(`/api/notifications?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  // Fetch settings
  useEffect(() => {
    if (!buyer?.id) return;
    fetch('/api/me/notification-settings')
      .then(r => r.json())
      .then(data => { if (data) setSettings({ ...DEFAULT_SETTINGS, ...data }); })
      .catch(() => {});
  }, [buyer?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true, userId: user.id }),
    }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead && user?.id) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: n.id }),
      }).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.linkUrl) {
      let target = n.linkUrl;
      if (!/^https?:\/\//i.test(target)) {
        if (!target.startsWith('/')) target = `/${target}`;
        const hasLocale = /^\/(ko|en|ja|zh|es|it|ru|ar|fr|pt|de)(\/|$)/.test(target);
        if (!hasLocale) target = `/${locale}${target}`;
      }
      router.push(target);
    }
  };

  const saveSetting = useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (updated: NotifSettings) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch('/api/me/notification-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});
      }, 300);
    };
  }, [])();

  const toggleSetting = (key: keyof NotifSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSetting(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <Link
          href={`/${locale}/my`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-0.5" />
          마이페이지
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">
                {unreadCount}
              </span>
            )}
          </h1>
          {tab === 'inbox' && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              모두 읽음
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'inbox' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Inbox className="h-4 w-4" />
            알림함
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            설정
          </button>
        </div>

        {/* Inbox Tab */}
        {tab === 'inbox' && (
          <div className="bg-white rounded-2xl overflow-hidden">
            {notifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">알림이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const Icon = getIcon(n.type);
                  const colorClass = getColor(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3.5 flex gap-3 transition-colors hover:bg-gray-50 ${
                        !n.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className={`shrink-0 mt-0.5 h-9 w-9 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500" />}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <>
            <div className="bg-white rounded-2xl p-5 mb-3">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">카카오톡 알림</h2>
              <div className="divide-y divide-gray-50">
                {(['kakaoOrder', 'kakaoShipping', 'kakaoDeliver', 'kakaoGonggu'] as const).map(key => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-700">{SETTING_LABELS[key]}</span>
                    <button
                      onClick={() => toggleSetting(key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? 'bg-gray-900' : 'bg-gray-200'}`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                        style={{ transform: settings[key] ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 mb-3">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">이메일 알림</h2>
              <div className="divide-y divide-gray-50">
                {(['emailOrder', 'emailShipping', 'emailDeliver', 'emailGonggu'] as const).map(key => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-700">{SETTING_LABELS[key]}</span>
                    <button
                      onClick={() => toggleSetting(key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? 'bg-gray-900' : 'bg-gray-200'}`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                        style={{ transform: settings[key] ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
