'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Flame } from 'lucide-react';

interface TimeDealProduct {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  originalPrice: number;
  campaignPrice: number;
  shopId: string;
  campaignId: string;
  endAt: string;
}

interface TimeDealSectionProps {
  products: TimeDealProduct[];
  locale: string;
}

function useCountdown(endAt: string) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(endAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return remaining;
}

function calcRemaining(endAt: string) {
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatKRW(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

function TimeDealCard({ product, locale }: { product: TimeDealProduct; locale: string }) {
  const countdown = useCountdown(product.endAt);
  const discount = Math.round(((product.originalPrice - product.campaignPrice) / product.originalPrice) * 100);

  if (countdown.expired) return null;

  return (
    <Link
      href={`/${locale}/${product.shopId}/product/${product.id}?campaign=${product.campaignId}`}
      className="shrink-0 w-[160px] group"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="160px"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-xs">
            이미지 없음
          </div>
        )}
        {/* 할인 뱃지 */}
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <Flame className="h-3 w-3" />
          {discount}%
        </div>
        {/* 타이머 뱃지 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded-lg flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-xs text-gray-900 line-clamp-1 font-medium">{product.name}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-bold text-red-500">{formatKRW(product.campaignPrice)}원</span>
        </div>
        <span className="text-[10px] text-gray-400 line-through">{formatKRW(product.originalPrice)}원</span>
      </div>
    </Link>
  );
}

export function TimeDealSection({ products, locale }: TimeDealSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="px-4 flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-bold text-[#1A1A1A]">타임딜</h2>
        </div>
        <span className="text-xs text-red-500 font-medium">마감 임박</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {products.map((product) => (
          <TimeDealCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}
