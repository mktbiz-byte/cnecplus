'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CreatorCard } from '@/components/shop/CreatorCard';
import { CategoryFilter } from '@/components/shop/CategoryFilter';
import { SkinTypeFilter } from '@/components/shop/SkinTypeFilter';

interface SerializedCreator {
  id: string;
  shopId?: string | null;
  displayName?: string | null;
  bio?: string | null;
  skinType?: string | null;
  totalSales: number;
  createdAt: Date | string;
  resolvedProfileImage?: string | null;
  product_count: number;
}

interface CreatorsPageClientProps {
  creators: SerializedCreator[];
  locale: string;
}

const PAGE_SIZE = 20;

export function CreatorsPageClient({ creators, locale }: CreatorsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isKo = locale === 'ko';

  const t = {
    title: isKo ? '크리에이터' : 'Creators',
    desc: isKo ? '나에게 맞는 뷰티 크리에이터를 찾아보세요' : 'Find the right beauty creator for you',
    all: isKo ? '전체' : 'All',
    sortPopular: isKo ? '인기순' : 'Popular',
    sortRecent: isKo ? '최신순' : 'Recent',
    noCreators: isKo ? '등록된 크리에이터가 없습니다' : 'No creators found',
    loadMore: isKo ? '더 보기' : 'Load More',
    productsCount: isKo ? '상품 {count}개' : '{count} products',
    catSkincare: isKo ? '스킨케어' : 'Skincare',
    catMakeup: isKo ? '메이크업' : 'Makeup',
    catBody: isKo ? '바디' : 'Body',
    catHair: isKo ? '헤어' : 'Hair',
    skinDry: isKo ? '건성' : 'Dry',
    skinOily: isKo ? '지성' : 'Oily',
    skinCombination: isKo ? '복합성' : 'Combination',
    skinSensitive: isKo ? '민감성' : 'Sensitive',
  };

  const categories = [
    { value: 'skincare', label: t.catSkincare },
    { value: 'makeup', label: t.catMakeup },
    { value: 'body', label: t.catBody },
    { value: 'hair', label: t.catHair },
  ];

  const skinTypes = [
    { value: 'dry', label: t.skinDry },
    { value: 'oily', label: t.skinOily },
    { value: 'combination', label: t.skinCombination },
    { value: 'oily_sensitive', label: t.skinSensitive },
  ];

  const [selectedSkinType, setSelectedSkinType] = useState(searchParams.get('skin_type') || '');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'popular');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const handleSkinTypeChange = (value: string) => {
    setSelectedSkinType(value);
    updateParams('skin_type', value);
  };

  const handleSortChange = (value: string) => {
    setSelectedSort(value);
    updateParams('sort', value);
  };

  const filteredCreators = useMemo(() => {
    let result = [...creators];

    if (selectedSkinType) {
      result = result.filter((c) => c.skinType === selectedSkinType);
    }

    if (selectedSort === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result.sort((a, b) => b.totalSales - a.totalSales);
    }

    return result;
  }, [creators, selectedSkinType, selectedSort]);

  const visibleCreators = filteredCreators.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCreators.length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.desc}</p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          <SkinTypeFilter
            skinTypes={skinTypes}
            selected={selectedSkinType}
            onChange={handleSkinTypeChange}
            allLabel={t.all}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('popular')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
                selectedSort === 'popular'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              }`}
            >
              {t.sortPopular}
            </button>
            <button
              onClick={() => handleSortChange('recent')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
                selectedSort === 'recent'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              }`}
            >
              {t.sortRecent}
            </button>
          </div>
        </div>

        {/* Grid */}
        {visibleCreators.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                locale={locale}
                productsLabel={t.productsCount}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">{t.noCreators}</p>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="rounded-full border border-border bg-card px-8 py-2.5 text-sm font-medium hover:border-primary/30 transition-colors"
            >
              {t.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
