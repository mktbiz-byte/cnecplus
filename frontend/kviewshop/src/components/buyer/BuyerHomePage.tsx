'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Users, ChevronRight } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { CategoryChips } from './CategoryChips';
import { BottomNav } from './BottomNav';
import { TimeDealSection } from '@/components/shop/TimeDealSection';
import { RecentViewsHome } from '@/components/shop/RecentViewsHome';

interface BrandInfo {
  brandName: string | null;
  logoUrl?: string | null;
}

interface ProductInfo {
  id: string;
  name: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  images: string[];
  originalPrice: number | null;
  salePrice: number | null;
  category: string | null;
  brand?: BrandInfo | null;
}

interface CampaignProduct {
  campaignPrice: number;
  product: ProductInfo;
}

interface GongguCampaign {
  id: string;
  title: string;
  endAt: string | null;
  creatorShopId?: string | null;
  brand: (BrandInfo & { logoUrl: string | null }) | null;
  products: CampaignProduct[];
}

interface CreatorInfo {
  id: string;
  username: string | null;
  shopId: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  product_count: number;
}

interface BuyerHomePageProps {
  locale: string;
  creators: CreatorInfo[];
  gongguCampaigns: GongguCampaign[];
  topProducts: ProductInfo[];
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getProductImage(product: ProductInfo): string | null {
  return product.thumbnailUrl || product.imageUrl || product.images?.[0] || null;
}

export function BuyerHomePage({ locale, creators, gongguCampaigns, topProducts }: BuyerHomePageProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Auto-rotate hero banner
  const bannerCampaigns = gongguCampaigns.filter(c => c.products.length > 0);
  const bannerCount = bannerCampaigns.length;

  const nextBanner = useCallback(() => {
    if (bannerCount > 1) {
      setBannerIndex(prev => (prev + 1) % bannerCount);
    }
  }, [bannerCount]);

  useEffect(() => {
    if (bannerCount <= 1) return;
    const id = setInterval(nextBanner, 5000);
    return () => clearInterval(id);
  }, [bannerCount, nextBanner]);

  // 타임딜: 72시간 이내 마감 상품 추출
  const timeDealProducts = gongguCampaigns
    .filter(c => {
      if (!c.endAt) return false;
      const diff = new Date(c.endAt).getTime() - Date.now();
      return diff > 0 && diff < 72 * 60 * 60 * 1000;
    })
    .flatMap(c =>
      c.products.map(cp => ({
        id: cp.product.id,
        name: cp.product.name || '',
        thumbnailUrl: cp.product.thumbnailUrl || cp.product.images?.[0] || null,
        originalPrice: cp.product.originalPrice || 0,
        campaignPrice: cp.campaignPrice,
        shopId: c.creatorShopId || '',
        campaignId: c.id,
        endAt: c.endAt!,
      })),
    )
    .slice(0, 10);

  // Ending today campaigns
  const endingToday = gongguCampaigns.filter(c => {
    if (!c.endAt) return false;
    const end = new Date(c.endAt);
    const now = new Date();
    return end.getFullYear() === now.getFullYear()
      && end.getMonth() === now.getMonth()
      && end.getDate() === now.getDate()
      && end.getTime() > now.getTime();
  });

  // Combined products for grid (gonggu products + top products, deduplicated)
  const allProducts: Array<{
    id: string;
    name: string | null;
    image: string | null;
    brandName: string | null;
    originalPrice: number;
    effectivePrice: number;
    discount: number;
    category: string | null;
  }> = [];

  const seenIds = new Set<string>();

  // Add gonggu campaign products
  gongguCampaigns.forEach(campaign => {
    campaign.products.forEach(cp => {
      if (seenIds.has(cp.product.id)) return;
      seenIds.add(cp.product.id);
      const orig = Number(cp.product.originalPrice ?? 0);
      const effective = Number(cp.campaignPrice ?? cp.product.salePrice ?? 0);
      const disc = orig > 0 ? Math.round(((orig - effective) / orig) * 100) : 0;
      allProducts.push({
        id: cp.product.id,
        name: cp.product.name,
        image: getProductImage(cp.product),
        brandName: cp.product.brand?.brandName || campaign.brand?.brandName || null,
        originalPrice: orig,
        effectivePrice: effective,
        discount: disc,
        category: cp.product.category,
      });
    });
  });

  // Add top products
  topProducts.forEach(product => {
    if (seenIds.has(product.id)) return;
    seenIds.add(product.id);
    const orig = Number(product.originalPrice ?? 0);
    const effective = Number(product.salePrice ?? 0);
    const disc = orig > 0 && effective < orig ? Math.round(((orig - effective) / orig) * 100) : 0;
    allProducts.push({
      id: product.id,
      name: product.name,
      image: getProductImage(product),
      brandName: product.brand?.brandName || null,
      originalPrice: orig,
      effectivePrice: effective,
      discount: disc,
      category: product.category,
    });
  });

  // Filter by category
  const filteredProducts = selectedCategory === 'all'
    ? allProducts
    : allProducts.filter(p => p.category?.toLowerCase() === selectedCategory);

  const hasContent = creators.length > 0 || gongguCampaigns.length > 0 || topProducts.length > 0;

  return (
    <div className="min-h-screen bg-white pb-[72px] md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="max-w-[480px] md:max-w-3xl lg:max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">CNEC</h1>
        </div>
      </header>

      <div className="max-w-[480px] md:max-w-3xl lg:max-w-5xl mx-auto">
        {/* Search bar */}
        <div className="px-4 pb-3">
          <Link
            href={`/${locale}/products`}
            className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#F5F5F5] text-[#8E8E93] text-sm"
          >
            <Search className="h-4 w-4" />
            <span>상품 검색</span>
          </Link>
        </div>

        {/* 타임딜 섹션 */}
        <TimeDealSection products={timeDealProducts} locale={locale} />

        {/* 최근 본 상품 */}
        <RecentViewsHome locale={locale} />

        {!hasContent ? (
          <div className="px-4 py-20 text-center">
            <Users className="h-10 w-10 mx-auto text-[#C7C7CC] mb-3" />
            <p className="text-sm font-medium text-[#8E8E93]">아직 크리에이터가 없어요</p>
            <p className="text-xs text-[#C7C7CC] mt-1 mb-6">첫 번째 크리에이터가 되어보세요</p>
            <Link
              href={`/${locale}/creators`}
              className="inline-flex items-center justify-center h-11 px-6 bg-[#1A1A1A] text-white rounded-full text-sm font-medium"
            >
              크리에이터 샵 둘러보기
            </Link>
          </div>
        ) : (
          <>
            {/* Creator avatars horizontal scroll */}
            {creators.length > 0 && (
              <section className="pb-4">
                <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-1 md:flex-wrap md:overflow-x-visible">
                  {creators.map(creator => {
                    const displayName = creator.displayName || creator.shopId || '';
                    const initials = displayName.slice(0, 1);
                    return (
                      <Link
                        key={creator.id}
                        href={`/${locale}/${creator.shopId}`}
                        className="flex flex-col items-center shrink-0 w-16"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#F5F5F5] ring-2 ring-[#E5E5EA]">
                          {creator.profileImageUrl ? (
                            <img
                              src={creator.profileImageUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base font-bold text-[#C7C7CC]">
                              {initials}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-[#1A1A1A] mt-1.5 line-clamp-1 text-center w-full">
                          {displayName}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Hero banner carousel */}
            {bannerCampaigns.length > 0 && (
              <section className="px-4 pb-5">
                <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-[#F5F5F5]">
                  {bannerCampaigns.map((campaign, idx) => {
                    const cp = campaign.products[0];
                    const image = getProductImage(cp.product);
                    const effectivePrice = Number(cp.campaignPrice ?? cp.product.salePrice ?? 0);
                    const originalPrice = Number(cp.product.originalPrice ?? 0);
                    const discount = originalPrice > 0
                      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
                      : 0;

                    return (
                      <Link
                        key={campaign.id}
                        href={`/${locale}/products/${cp.product.id}`}
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          idx === bannerIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={cp.product.name || campaign.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#F5F5F5] to-[#E5E5EA]" />
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Banner text */}
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <p className="text-xs font-medium opacity-80 mb-1">
                            {campaign.brand?.brandName || '공구 진행중'}
                          </p>
                          <h3 className="text-base font-bold line-clamp-1">{cp.product.name}</h3>
                          <div className="flex items-baseline gap-2 mt-1">
                            {discount > 0 && (
                              <span className="text-sm font-bold text-red-400">{discount}%</span>
                            )}
                            <span className="text-sm font-bold">{formatKRW(effectivePrice)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {/* Dots */}
                  {bannerCount > 1 && (
                    <div className="absolute bottom-2 right-3 flex gap-1">
                      {bannerCampaigns.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.preventDefault(); setBannerIndex(idx); }}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            idx === bannerIndex ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Ending today section */}
            {endingToday.length > 0 && (
              <section className="pb-5">
                <div className="px-4 flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-[#1A1A1A]">오늘이 마지막 기회</h2>
                  <Link
                    href={`/${locale}/products`}
                    className="text-xs text-[#8E8E93] flex items-center gap-0.5"
                  >
                    전체보기 <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
                  {endingToday.map(campaign => {
                    const cp = campaign.products[0];
                    if (!cp) return null;
                    const image = getProductImage(cp.product);
                    const effectivePrice = Number(cp.campaignPrice ?? cp.product.salePrice ?? 0);

                    return (
                      <Link
                        key={campaign.id}
                        href={`/${locale}/products/${cp.product.id}`}
                        className="shrink-0 w-36"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F5F5F5]">
                          {image ? (
                            <Image src={image} alt={cp.product.name || ''} fill className="object-cover" sizes="144px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#C7C7CC] text-sm">
                              이미지 없음
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <div className="bg-red-500 text-white rounded-md px-2 py-0.5 text-[11px] font-bold flex items-center gap-1">
                              <CountdownTimer endAt={campaign.endAt!} className="tabular-nums" />
                            </div>
                          </div>
                        </div>
                        <p className="text-[13px] font-medium text-[#1A1A1A] mt-2 line-clamp-1">{cp.product.name}</p>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">{formatKRW(effectivePrice)}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Category chips */}
            <section className="pb-4">
              <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />
            </section>

            {/* Product grid */}
            <section className="px-4 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-[#1A1A1A]">전체 상품</h2>
              </div>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredProducts.map(product => (
                    <Link
                      key={product.id}
                      href={`/${locale}/products/${product.id}`}
                      className="block group"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-[#F5F5F5]">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name || ''}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#C7C7CC] text-sm">
                            이미지 없음
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        {product.brandName && (
                          <p className="text-[12px] text-[#8E8E93] truncate">{product.brandName}</p>
                        )}
                        <h3 className="text-[14px] text-[#1A1A1A] line-clamp-2 leading-snug mt-0.5">
                          {product.name}
                        </h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          {product.discount > 0 && (
                            <span className="text-[14px] font-bold text-red-500">{product.discount}%</span>
                          )}
                          <span className="text-[14px] font-bold text-[#1A1A1A]">
                            {formatKRW(product.effectivePrice)}
                          </span>
                        </div>
                        {product.discount > 0 && (
                          <span className="text-[12px] text-[#C7C7CC] line-through">
                            {formatKRW(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#8E8E93]">해당 카테고리에 상품이 없어요</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
