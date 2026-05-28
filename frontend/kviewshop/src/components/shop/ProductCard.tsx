import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Product, Campaign } from '@/types/database';
import { calculateDDay, getDDayLabel } from '@/lib/utils/date';
import { ProductCardActions } from './ProductCardActions';

interface ProductCardProps {
  product: Product;
  campaign?: Campaign | null;
  campaignPrice?: number;
  locale: string;
  shopId?: string;
  creatorId?: string;
  isWishlisted?: boolean;
  isLoggedIn?: boolean;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calcDDay(endAt: string | undefined | null): { label: string; active: boolean } {
  const days = calculateDDay(endAt);
  if (days <= 0 && days !== 0) return { label: '', active: false };
  const label = getDDayLabel(days);
  return { label, active: days >= 0 };
}

function discountPercent(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function ProductCard({ product, campaign, campaignPrice, locale, shopId, creatorId, isWishlisted, isLoggedIn }: ProductCardProps) {
  const effectivePrice = campaignPrice ?? product.sale_price;
  const discount = discountPercent(product.original_price, effectivePrice);
  const dDay = campaign ? calcDDay(campaign.end_at) : { label: '', active: false };
  const imageUrl = product.thumbnail_url || product.images?.[0];

  const href = shopId
    ? `/${locale}/${shopId}/product/${product.id}`
    : `/${locale}/products/${product.id}`;

  return (
    <Link
      href={href}
      className="group block"
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PC9zdmc+"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            이미지 없음
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {dDay.active && (
            <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
              {dDay.label}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2">
        {product.brand && (
          <span className="text-xs text-gray-400">{product.brand.brand_name}</span>
        )}
        <h3 className="text-sm text-gray-900 line-clamp-2 leading-snug mt-0.5">{product.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          {discount > 0 && (
            <span className="text-sm font-bold text-red-500">{discount}%</span>
          )}
          <span className="text-base font-bold text-gray-900">{formatKRW(effectivePrice)}</span>
        </div>
        {discount > 0 && (
          <span className="text-xs text-gray-300 line-through">{formatKRW(product.original_price)}</span>
        )}

        {/* 별점 + 리뷰 수 */}
        {(product.review_count ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-500">
              {product.average_rating ? Number(product.average_rating).toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-gray-300">({product.review_count})</span>
          </div>
        )}

        {creatorId && (
          <ProductCardActions
            creatorId={creatorId}
            productId={product.id}
            isWishlisted={isWishlisted}
            isLoggedIn={isLoggedIn ?? false}
            className="mt-2"
          />
        )}
      </div>
    </Link>
  );
}
