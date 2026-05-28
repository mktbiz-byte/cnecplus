'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';

interface RecentItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string | null;
    thumbnailUrl: string | null;
    salePrice: string | number | null;
    images: string[];
  };
  creator: {
    shopId: string | null;
  } | null;
}

interface RecentViewsHomeProps {
  locale: string;
}

function formatKRW(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

export function RecentViewsHome({ locale }: RecentViewsHomeProps) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    fetch('/api/me/recent-views?limit=10')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setItems(data.items || []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      <div className="px-4 flex items-center gap-1.5 mb-3">
        <Clock className="h-4 w-4 text-gray-400" />
        <h2 className="text-base font-bold text-[#1A1A1A]">최근 본 상품</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {items.map((item) => {
          const p = item.product;
          const image = p.thumbnailUrl || p.images?.[0];
          const price = p.salePrice ? Number(p.salePrice) : 0;
          const shopId = item.creator?.shopId;
          const href = shopId
            ? `/${locale}/${shopId}/product/${p.id}`
            : `/${locale}/search?q=${encodeURIComponent(p.name || '')}`;

          return (
            <Link key={item.id} href={href} className="shrink-0 w-[120px] group">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                {image ? (
                  <Image
                    src={image}
                    alt={p.name || ''}
                    fill
                    sizes="120px"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300 text-xs">
                    이미지 없음
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-900 line-clamp-1 mt-1.5">{p.name}</p>
              {price > 0 && (
                <p className="text-xs font-bold text-gray-900 mt-0.5">{formatKRW(price)}원</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
