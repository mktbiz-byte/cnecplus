'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/lib/actions/cart';
import { toggleWishlist, isProductWishlisted } from '@/lib/actions/wishlist';
import { useGuestWishlistStore } from '@/lib/store/guest-wishlist';
import { useUser } from '@/lib/hooks/use-user';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Truck,
  RotateCcw,
  Share2,
  ShoppingBag,
  Flame,
  Play,
  ExternalLink,
  Heart,
  X,
  BadgeCheck,
  Bell,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ShareSheet } from '@/components/shop/ShareSheet';
import { BrandBadge } from '@/components/common/BrandBadge';
import { ReviewSection } from '@/components/shop/ReviewSection';
import { calculateDDay, getTimeRemaining, hasCampaignStarted } from '@/lib/utils/date';
import type {
  Product,
  CampaignProduct,
  Creator,
  Campaign,
} from '@/types/database';

// =============================================
// Props
// =============================================

interface CreatorContentItem {
  id: string;
  type: string;
  url: string;
  embedUrl: string | null;
  caption: string | null;
  sortOrder: number;
}

interface ProductDetailPageProps {
  product: Product;
  campaignProduct: CampaignProduct | null;
  creator: Creator;
  locale: string;
  username: string;
  otherProducts?: { id: string; name: string; images?: string[]; salePrice?: number; originalPrice?: number }[];
  creatorContents?: CreatorContentItem[];
  reelsUrl?: string | null;
  reelsCaption?: string | null;
}

// =============================================
// Helpers
// =============================================

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateDiscountPercent(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

// =============================================
// Main Component
// =============================================

export function ProductDetailPage({
  product,
  campaignProduct,
  creator,
  locale,
  username,
  otherProducts,
  creatorContents,
  reelsUrl,
  reelsCaption,
}: ProductDetailPageProps) {
  const router = useRouter();
  const { buyer } = useUser();
  const guestWishlist = useGuestWishlistStore();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // 찜 상태 초기 로드
  useEffect(() => {
    if (buyer) {
      isProductWishlisted(creator.id, product.id).then(setLiked).catch(() => {});
    } else {
      setLiked(guestWishlist.isWishlisted(creator.id, product.id));
    }
  }, [buyer, creator.id, product.id, guestWishlist]);

  const campaign = campaignProduct?.campaign as Campaign | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaignAny = campaign as any;
  const startAt = campaignAny?.start_at ?? campaignAny?.startAt;
  const isGonggu = !!campaignProduct && campaign?.type === 'GONGGU' && campaign?.status === 'ACTIVE' && hasCampaignStarted(startAt as string | undefined);
  const isNotYetStarted = !!campaignProduct && campaign?.type === 'GONGGU' && !hasCampaignStarted(startAt as string | undefined);

  // Normalize snake_case/camelCase — Prisma types don't expose snake_case fields but DB returns them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cp = campaignProduct as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = campaignAny;

  const effectivePrice = Number(cp?.campaign_price ?? cp?.campaignPrice ?? p.sale_price ?? p.salePrice ?? 0);
  const originalPrice = Number(p.original_price ?? p.originalPrice ?? 0);
  const discountPercent = calculateDiscountPercent(originalPrice, effectivePrice);
  const brandName = p.brand?.brand_name || p.brand?.brandName || '';
  const brandLogo = p.brand?.logo_url || p.brand?.logoUrl || '';
  const images = product.images && product.images.length > 0 ? product.images : [];
  const campaignId = cp?.campaign_id ?? cp?.campaignId;
  const productUrl = `https://www.cnecshop.com/${username}/product/${product.id}${campaignId ? `?campaign=${campaignId}` : ''}`;
  const ogTitle = `${product.name}${discountPercent > 0 ? ` ${discountPercent}% OFF` : ''}`;
  const ogDesc = `${brandName} | ${formatKRW(effectivePrice)}`;

  // Gonggu progress
  const totalStock = Number(c?.total_stock ?? c?.totalStock ?? 0);
  const soldCount = Number(c?.sold_count ?? c?.soldCount ?? 0);
  const progressPercent = totalStock > 0 ? Math.min(Math.round((soldCount / totalStock) * 100), 100) : 0;
  const remainingStock = totalStock > 0 ? totalStock - soldCount : product.stock;

  // D-day / ended check
  const endAt = c?.end_at ?? c?.endAt;
  const dDayNum = calculateDDay(endAt as string | undefined);
  const isEnded = isGonggu && endAt && new Date(endAt as string).getTime() <= Date.now();

  // Countdown timer
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!isGonggu || !endAt) return;

    const updateCountdown = () => {
      const t = getTimeRemaining(endAt as string);
      if (t.total <= 0) {
        setCountdown('');
        return;
      }
      const pad = (n: number) => n.toString().padStart(2, '0');
      setCountdown(
        `${t.days > 0 ? `${t.days}일 ` : ''}${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isGonggu, endAt]);

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Touch swipe for image gallery
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextImage();
      else handlePrevImage();
    }
  }, [handleNextImage, handlePrevImage]);

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addToCart({
        shopId: creator.id,
        productId: product.id,
        campaignId: campaignId as string | undefined,
        quantity,
      });
      toast.success('장바구니에 담았습니다');
    } catch {
      toast.error('장바구니 추가에 실패했습니다');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuy = async () => {
    await handleAddToCart();
    setSheetOpen(false);
    router.push(`/${locale}/${username}/checkout`);
  };

  const handleAddToCartAndClose = async () => {
    await handleAddToCart();
    setSheetOpen(false);
  };

  const handleToggleWishlist = async () => {
    if (buyer) {
      try {
        const result = await toggleWishlist({ shopId: creator.id, productId: product.id });
        setLiked(result.wishlisted);
        toast.success(result.wishlisted ? '찜 목록에 추가했습니다' : '찜 목록에서 제거했습니다');
      } catch {
        toast.error('찜 처리에 실패했습니다');
      }
    } else {
      const wishlisted = guestWishlist.toggle({ shopId: creator.id, productId: product.id });
      setLiked(wishlisted);
      if (wishlisted) {
        toast('찜 목록에 추가했습니다', { description: '회원이면 영구 저장돼요' });
      }
    }
  };

  // Creator name
  const cAny = creator as unknown as Record<string, unknown>;
  const creatorName = (cAny.displayName || cAny.display_name || cAny.shopId || cAny.shop_id || '') as string;
  const creatorProfileUrl = (cAny.profileImageUrl || cAny.profile_image_url || '') as string;

  const canBuy = !isEnded && !isNotYetStarted && product.stock > 0;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* A. Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center justify-between h-12 px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5 text-gray-900" />
          </button>

          <Link
            href={`/${locale}/${username}`}
            className="text-[15px] font-semibold text-gray-900 truncate max-w-[200px]"
          >
            {creatorName}
          </Link>

          <div className="flex items-center gap-0.5">
            <ShareSheet
              url={productUrl}
              title={ogTitle}
              description={ogDesc}
              imageUrl={(p.thumbnail_url || p.thumbnailUrl || images[0]) as string}
              trigger={
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="공유하기"
                >
                  <Share2 className="h-[18px] w-[18px] text-gray-900" />
                </button>
              }
            />
            <Link
              href={`/${locale}/${username}/checkout`}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="장바구니"
            >
              <ShoppingBag className="h-[18px] w-[18px] text-gray-900" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* B. Image Carousel */}
        {images.length > 0 ? (
          <div className="relative bg-white">
            <div
              className="aspect-square relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Ended overlay */}
              {isEnded && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">마감된 공구</span>
                </div>
              )}
              <Image
                src={images[currentImageIndex]}
                alt={`${product.name} - ${currentImageIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 512px"
                className="object-cover"
                priority={currentImageIndex === 0}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PC9zdmc+"
              />
              {images.length > 1 && !isEnded && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center hover:bg-white/90 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center hover:bg-white/90 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}
              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`rounded-full transition-all ${
                        idx === currentImageIndex
                          ? 'w-5 h-2 bg-white'
                          : 'w-2 h-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            이미지 없음
          </div>
        )}

        {/* C. Product Info Section */}
        <div className="bg-white px-4 py-5">
          {isEnded ? (
            <>
              {/* Ended state info */}
              {brandName && (
                <p className="text-sm text-gray-500 mb-1">{brandName}</p>
              )}
              <h1 className="text-lg font-bold text-gray-900 leading-snug">
                {product.name}
              </h1>
              <p className="text-base text-gray-400 mt-2">
                {formatKRW(effectivePrice)} 마감 가격
              </p>
            </>
          ) : (
            <>
              {/* Live state info */}
              {isGonggu && (
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-medium border border-emerald-200 mb-3">
                  크리에이터 단독가
                </span>
              )}

              {brandName && (
                <p className="text-sm text-gray-500 mb-1">{brandName}</p>
              )}

              <h1 className="text-lg font-bold text-gray-900 leading-snug">
                {product.name}
              </h1>

              {product.volume && (
                <p className="text-sm text-gray-400 mt-0.5">{product.volume}</p>
              )}

              {/* Pricing */}
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  {discountPercent > 0 && (
                    <span className="text-2xl font-bold text-red-500">
                      {discountPercent}%
                    </span>
                  )}
                  <span className="text-2xl font-bold text-gray-900">
                    {formatKRW(effectivePrice)}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <p className="text-sm text-gray-400 line-through mt-0.5">
                    {formatKRW(originalPrice)}
                  </p>
                )}
              </div>

              {/* Gonggu countdown banner */}
              {isGonggu && countdown && (
                <div className="mt-3 bg-red-50 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-sm font-bold text-red-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    공구 마감까지 {countdown}
                  </p>
                </div>
              )}

              {/* Low stock warning */}
              {remainingStock > 0 && remainingStock <= 10 && (
                <p className="text-sm text-red-500 font-medium mt-2">
                  한정 수량 {remainingStock}개 남음
                </p>
              )}

              {/* Gonggu progress bar */}
              {isGonggu && totalStock > 0 && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {soldCount}/{totalStock}개 판매
                    </span>
                    <span className="text-xs text-gray-400">{progressPercent}%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* D. Creator Recommendation Card */}
        <Link
          href={`/${locale}/${username}`}
          className="block mx-4 mt-4 rounded-xl bg-gray-50 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden shrink-0">
              {creatorProfileUrl ? (
                <Image
                  src={creatorProfileUrl}
                  alt={creatorName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                  {creatorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{creatorName}</p>
              <p className="text-xs text-gray-500 line-clamp-1">
                {isGonggu ? '이 크리에이터가 추천하는 공구 상품이에요' : '이 크리에이터가 추천하는 상품이에요'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </Link>

        {/* E. Brand Info + CS */}
        <div className="mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
              {brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-gray-400">{brandName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <BrandBadge brandName={brandName} size="sm" />
                <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">크넥 인증 브랜드</p>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <p className="text-xs text-gray-500">
              배송/교환/환불은 {brandName || '브랜드'}이(가) 처리합니다
            </p>
          </div>
        </div>

        {/* Quantity Selector (inline, non-gonggu) */}
        {!isGonggu && !isEnded && (
          <div className="bg-white px-4 py-4 mt-4 mx-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">수량</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="w-8 text-center font-medium text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Details Accordion */}
        {((p.description || p.descriptionKo) || (p.howToUse || p.how_to_use) || p.ingredients) && (
          <div className="bg-white mt-4 px-4 mx-4 rounded-xl border border-gray-100">
            <Accordion type="multiple" defaultValue={["description"]}>
              {(p.description || p.descriptionKo) && (
                <AccordionItem value="description">
                  <AccordionTrigger className="text-sm font-medium text-gray-900">
                    상품 설명
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      className="text-sm text-gray-600 leading-relaxed whitespace-pre-line"
                      dangerouslySetInnerHTML={{
                        __html: ((p.descriptionKo || p.description || '') as string).replace(/\n/g, '<br />'),
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
              {(p.howToUse || p.how_to_use) && (
                <AccordionItem value="howToUse">
                  <AccordionTrigger className="text-sm font-medium text-gray-900">
                    사용법
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      className="text-sm text-gray-600 leading-relaxed whitespace-pre-line"
                      dangerouslySetInnerHTML={{
                        __html: ((p.howToUse || p.how_to_use || '') as string).replace(/\n/g, '<br />'),
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
              {p.ingredients && (
                <AccordionItem value="ingredients">
                  <AccordionTrigger className="text-sm font-medium text-gray-900">
                    전성분
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                      {p.ingredients as string}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
            {(p.detailUrl || p.detail_url) && (
              <div className="py-3 border-t border-gray-100">
                <a
                  href={(p.detailUrl || p.detail_url) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  브랜드 상세페이지 보기
                </a>
              </div>
            )}
          </div>
        )}

        {/* Creator Review Section */}
        {((creatorContents && creatorContents.length > 0) || reelsUrl) && (
          <div className="bg-white mt-4 py-5 mx-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 px-4 mb-4">
              <Play className="w-4 h-4 text-gray-600" />
              <h2 className="text-base font-semibold text-gray-900">크리에이터 리뷰</h2>
              {(() => {
                const count = (creatorContents?.length ?? 0) + (reelsUrl ? 1 : 0);
                return count > 0 ? (
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {count}개
                  </span>
                ) : null;
              })()}
            </div>

            {(() => {
              const allItems: Array<{ id: string; url: string; caption: string | null; isReels?: boolean }> = [];
              if (creatorContents) {
                for (const ci of creatorContents) {
                  allItems.push({ id: ci.id, url: ci.url, caption: ci.caption });
                }
              }
              if (reelsUrl) {
                allItems.push({ id: 'reels', url: reelsUrl, caption: reelsCaption ?? null, isReels: true });
              }

              if (allItems.length === 1) {
                const item = allItems[0];
                return (
                  <div className="px-4 flex justify-center">
                    <div className="w-full max-w-[300px]">
                      <button
                        onClick={() => window.open(item.url, '_blank')}
                        className="relative w-full overflow-hidden rounded-2xl shadow-sm block"
                        style={{ aspectRatio: '9/16' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-pink-500/10" />
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {creatorName.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-gray-800">{creatorName}</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-7 h-7 text-white ml-1" />
                          </div>
                        </div>
                      </button>
                      {item.caption && (
                        <div className="mt-3">
                          <p className={`text-sm text-gray-600 leading-relaxed ${!expandedCaptions[item.id] ? 'line-clamp-2' : ''}`}>
                            {item.caption}
                          </p>
                          {item.caption.length > 80 && (
                            <button
                              onClick={() => setExpandedCaptions((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-xs text-gray-400 hover:text-gray-600 mt-1 font-medium"
                            >
                              {expandedCaptions[item.id] ? '접기' : '더보기'}
                            </button>
                          )}
                        </div>
                      )}
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2"
                      >
                        <ExternalLink className="w-3 h-3" /> 인스타그램에서 보기
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                  {allItems.map((item) => (
                    <div key={item.id} className="flex-shrink-0" style={{ width: '240px', scrollSnapAlign: 'start' }}>
                      <button
                        onClick={() => window.open(item.url, '_blank')}
                        className="relative w-full overflow-hidden rounded-2xl shadow-sm block"
                        style={{ aspectRatio: '9/16' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-pink-500/10" />
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {creatorName.charAt(0)}
                          </div>
                          <span className="text-[11px] font-medium text-gray-800">{creatorName}</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-6 h-6 text-white ml-0.5" />
                          </div>
                        </div>
                      </button>
                      {item.caption && (
                        <div className="mt-2">
                          <p className={`text-sm text-gray-600 leading-relaxed ${!expandedCaptions[item.id] ? 'line-clamp-2' : ''}`}>
                            {item.caption}
                          </p>
                          {item.caption.length > 60 && (
                            <button
                              onClick={() => setExpandedCaptions((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-xs text-gray-400 hover:text-gray-600 mt-1 font-medium"
                            >
                              {expandedCaptions[item.id] ? '접기' : '더보기'}
                            </button>
                          )}
                        </div>
                      )}
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1.5"
                      >
                        <ExternalLink className="w-3 h-3" /> 인스타그램에서 보기
                      </a>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Shipping Info */}
        <div className="bg-white mt-4 mx-4 rounded-xl border border-gray-100">
          <button
            onClick={() => setShippingOpen(!shippingOpen)}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">배송 안내</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${shippingOpen ? 'rotate-180' : ''}`} />
          </button>
          {shippingOpen && (
            <div className="px-4 pb-4 text-sm text-gray-500 space-y-2">
              {(p.shipping_info || p.shippingInfo) ? (
                <p>{(p.shipping_info || p.shippingInfo) as string}</p>
              ) : (
                <>
                  <p>배송비: {(() => {
                    const feeType = (p.shipping_fee_type || p.shippingFeeType || 'FREE') as string;
                    const fee = Number(p.shipping_fee ?? p.shippingFee ?? 3000);
                    const threshold = Number(p.free_shipping_threshold ?? p.freeShippingThreshold ?? 50000);
                    if (feeType === 'FREE') return '무료배송';
                    if (feeType === 'CONDITIONAL_FREE') return `${formatKRW(threshold)} 이상 무료배송 (기본 ${formatKRW(fee)})`;
                    return formatKRW(fee);
                  })()}</p>
                  <p>배송기간: 결제 후 2~5일 이내 배송</p>
                  <p>제주/도서산간 지역은 추가 배송비가 발생할 수 있습니다.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Return/Exchange */}
        <div className="bg-white mt-2 mx-4 rounded-xl border border-gray-100">
          <button
            onClick={() => setReturnOpen(!returnOpen)}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">교환/환불 안내</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${returnOpen ? 'rotate-180' : ''}`} />
          </button>
          {returnOpen && (
            <div className="px-4 pb-4 text-sm text-gray-500 space-y-2">
              {(p.return_policy || p.returnPolicy) ? (
                <p>{(p.return_policy || p.returnPolicy) as string}</p>
              ) : (
                <>
                  <p>수령 후 7일 이내 교환/환불 가능</p>
                  <p>고객 변심에 의한 반품 시 왕복 배송비 부담</p>
                  <p>상품 하자 시 배송비 포함 100% 환불</p>
                  <p>사용 또는 개봉한 상품은 교환/환불이 불가합니다.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Other Products */}
        {otherProducts && otherProducts.length > 0 && (
          <div className="bg-white mt-4 py-5 mx-4 rounded-xl border border-gray-100">
            <h2 className="px-4 text-base font-semibold text-gray-900 mb-3">
              이 크리에이터의 다른 상품
            </h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {otherProducts.map((op) => (
                <Link key={op.id} href={`/${locale}/${username}/product/${op.id}`} className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 relative">
                    {op.images?.[0] ? (
                      <Image src={op.images[0]} alt={op.name} fill className="object-cover" sizes="128px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">이미지 없음</div>
                    )}
                  </div>
                  <p className="text-xs text-gray-900 line-clamp-1 mt-1.5">{op.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatKRW(Number(op.salePrice ?? 0))}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CS Notice */}
        <div className="py-4 px-4">
          <p className="text-xs text-center text-gray-400">
            배송/CS는 브랜드가 직접 처리합니다 | 크넥이 안전하게 관리해요
          </p>
        </div>

        {/* H. Review Section */}
        <div className="px-4">
          <ReviewSection productId={product.id} locale={locale} />
        </div>
      </div>

      {/* F. Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 h-[72px]">
          {/* Wishlist button (always visible) */}
          <button
            onClick={handleToggleWishlist}
            className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>

          {isEnded ? (
            <>
              {/* Ended state buttons */}
              <button
                disabled
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] border border-gray-200 text-gray-400 bg-white"
              >
                마감된 공구
              </button>
              <button
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] bg-gray-900 text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
              >
                <Bell className="w-4 h-4" />
                다음 공구 알림
              </button>
            </>
          ) : isNotYetStarted ? (
            <button
              disabled
              className="flex-1 h-12 rounded-xl font-semibold text-[14px] bg-gray-100 text-gray-400"
            >
              오픈 예정
            </button>
          ) : product.stock === 0 ? (
            <button
              disabled
              className="flex-1 h-12 rounded-xl font-semibold text-[14px] bg-gray-100 text-gray-400"
            >
              품절
            </button>
          ) : (
            <>
              {/* Live state buttons */}
              <button
                onClick={handleAddToCartAndClose}
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] border border-gray-200 text-gray-900 hover:bg-gray-50 transition-colors"
              >
                장바구니
              </button>
              <button
                onClick={() => setSheetOpen(true)}
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] bg-gray-900 text-white active:scale-[0.98] transition-transform"
              >
                지금 참여하기
              </button>
            </>
          )}
        </div>
      </div>

      {/* G. Option Bottom Sheet */}
      {sheetOpen && (
        <>
          {/* Dim overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-lg mx-auto px-5 pt-4 pb-5">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Close */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold text-gray-900">옵션 선택</h3>
                <button onClick={() => setSheetOpen(false)} className="p-1">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Product summary */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                {images[0] && (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                    <Image src={images[0]} alt={product.name || ''} fill className="object-cover" sizes="56px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-1">{product.name}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{formatKRW(effectivePrice)}</p>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-900">수량</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-6 text-center font-semibold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mb-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">총 금액</span>
                <span className="text-xl font-bold text-gray-900">{formatKRW(effectivePrice * quantity)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCartAndClose}
                  className="flex-1 h-[52px] rounded-xl font-semibold text-[15px] border border-gray-200 text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  장바구니
                </button>
                <button
                  onClick={handleBuy}
                  className="flex-1 h-[52px] rounded-xl font-semibold text-[15px] bg-gray-900 text-white active:scale-[0.98] transition-transform"
                >
                  바로 구매
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
