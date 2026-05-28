'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cnec-cookie-consent';

export function CookieConsent({ locale }: { locale: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // 1초 후에 표시 (페이지 로드 후 자연스럽게)
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
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
                ? '더 나은 서비스를 위해 쿠키를 사용합니다. 계속 이용하시면 쿠키 사용에 동의하는 것으로 간주합니다.'
                : 'We use cookies to improve your experience. By continuing, you agree to our cookie policy.'}
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
            {isKo ? '거부' : 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 text-xs font-medium text-white py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333] transition-colors"
          >
            {isKo ? '동의' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
