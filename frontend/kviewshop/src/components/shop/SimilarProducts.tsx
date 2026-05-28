'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Sparkles } from 'lucide-react';

interface SimilarProduct {
  id: string;
  name: string | null;
  nameKo: string | null;
  thumbnailUrl: string | null;
  images: string[];
  originalPrice: number | null;
  salePrice: number | null;
  reviewCount: number;
  averageRating: number | null;
  brand: { brandName: string | null } | null;
}

interface SimilarProductsProps {
  productId: string;
  locale: string;
}

function formatKRW(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

export function SimilarProducts({ productId, locale }: SimilarProductsProps) {
  const [products, setProducts] = useState<SimilarProduct[]>([]);

  useEffect(() => {
    fetch(`/api/products/similar?productId=${productId}&limit=8`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {});
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <section className="px-4 py-5 bg-white border-t border-gray-50">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-bold text-gray-900">이런 상품은 어때요?</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {products.map((p) => {
          const image = p.thumbnailUrl || p.images?.[0];
          const price = p.salePrice ?? p.originalPrice ?? 0;
          const discount =
            p.originalPrice && p.salePrice && p.originalPrice > p.salePrice
              ? Math.round(((p.originalPrice - p.salePrice) / p.originalPrice) * 100)
              : 0;

          return (
            <Link
              key={p.id}
              href={`/${locale}/search?q=${encodeURIComponent(p.name || p.nameKo || '')}`}
              className="shrink-0 w-[130px] group"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                {image ? (
                  <Image
                    src={image}
                    alt={p.name || ''}
                    fill
                    sizes="130px"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300 text-xs">
                    이미지 없음
                  </div>
                )}
              </div>
              <div className="mt-1.5">
                {p.brand && (
                  <p className="text-[10px] text-gray-400 truncate">{p.brand.brandName}</p>
                )}
                <p className="text-xs text-gray-900 line-clamp-1">{p.name || p.nameKo}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  {discount > 0 && (
                    <span className="text-xs font-bold text-red-500">{discount}%</span>
                  )}
                  <span className="text-xs font-bold">{formatKRW(price)}원</span>
                </div>
                {p.reviewCount > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] text-gray-400">
                      {p.averageRating?.toFixed(1)} ({p.reviewCount})
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
