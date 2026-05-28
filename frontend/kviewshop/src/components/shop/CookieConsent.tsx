'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cnec-cookie-consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

/**
 * 쿠키 동의 상태 확인 유틸 (다른 컴포넌트에서 사용 가능)
 */
export function getCookieConsent(): 'accepted' | 'declined' | null {
  if (typeof window === 'undefined') return null;
  // 쿠키에서 먼저 확인
  const match = document.cookie.match(/(?:^|; )cnec_consent=(\w+)/);
  if (match) return match[1] as 'accepted' | 'declined';
  // localStorage 폴백
  return localStorage.getItem(COOKIE_CONSENT_KEY) as 'accepted' | 'declined' | null;
}

/**
 * 비필수 쿠키(추적용) 사용 가능 여부
 */
export function isTrackingAllowed(): boolean {
  return getCookieConsent() === 'accepted';
}

function setConsent(value: 'accepted' | 'declined') {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  // 동의 상태를 쿠키로도 저장 (서버에서도 확인 가능)
  document.cookie = `cnec_consent=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  if (value === 'declined') {
    // 거부 시 기존 추적 쿠키 삭제
    const trackingCookies = ['_ga', '_gid', '_fbp'];
    trackingCookies.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0`;
    });
  }
}

export function CookieConsent({ locale }: { locale: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setConsent('accepted');
    setShow(false);
  };

  const handleDecline = () => {
    setConsent('declined');
    setShow(false);
  };

  if (!show) return null;

  const isKo = locale === 'ko';

  return (
    <div
      role="dialog"
      aria-label={isKo ? '쿠키 동의' : 'Cookie consent'}
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[60] animate-in slide-in-from-bottom duration-300"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isKo ? '쿠키 사용 안내' : 'Cookie Notice'}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              {isKo
                ? '서비스 개선 및 맞춤형 경험을 위해 쿠키를 사용합니다. 필수 쿠키는 항상 활성화되며, 선택적 추적 쿠키는 동의 시에만 사용됩니다.'
                : 'We use cookies for essential features and optional tracking. Essential cookies are always active. Tracking cookies are used only with your consent.'}
              {' '}
              <Link
                href={`/${locale}/privacy`}
                className="text-primary underline underline-offset-2"
              >
                {isKo ? '개인정보처리방침' : 'Privacy Policy'}
              </Link>
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isKo ? '닫기' : 'Close'}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDecline}
            className="flex-1 text-xs font-medium text-gray-500 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {isKo ? '필수만 허용' : 'Essential Only'}
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 text-xs font-medium text-white py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333] transition-colors"
          >
            {isKo ? '모두 허용' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
}
