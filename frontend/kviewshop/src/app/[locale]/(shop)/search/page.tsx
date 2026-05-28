'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, SlidersHorizontal, X, Star } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { CategoryFilter } from '@/components/shop/CategoryFilter';

const PAGE_SIZE = 20;

type SortKey = 'popular' | 'relevance' | 'recent' | 'price_low' | 'price_high' | 'rating' | 'review';
type PriceRange = '' | 'under10k' | 'under30k' | 'under50k' | 'over50k';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ko';
  const isKo = locale === 'ko';

  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange>(
    (searchParams.get('price') as PriceRange) || ''
  );
  const [selectedSort, setSelectedSort] = useState<SortKey>(
    (searchParams.get('sort') as SortKey) || 'popular'
  );
  const [showFilters, setShowFilters] = useState(false);

  const t = {
    searchPlaceholder: isKo ? '상품명, 브랜드로 검색...' : 'Search products, brands...',
    noResults: isKo ? '검색 결과가 없습니다' : 'No results found',
    tryAnother: isKo ? '다른 키워드로 검색해보세요' : 'Try different keywords',
    results: isKo ? '개의 검색 결과' : ' results found',
    filter: isKo ? '필터' : 'Filter',
    all: isKo ? '전체' : 'All',
    sortPopular: isKo ? '인기순' : 'Popular',
    sortRelevance: isKo ? '관련성순' : 'Relevance',
    sortRecent: isKo ? '��신순' : 'Recent',
    sortPriceLow: isKo ? '낮은가격순' : 'Price: Low',
    sortPriceHigh: isKo ? '높은가격순' : 'Price: High',
    sortRating: isKo ? '평점순' : 'Top Rated',
    sortReview: isKo ? '리뷰많은순' : 'Most Reviews',
    catSkincare: isKo ? '스킨케어' : 'Skincare',
    catMakeup: isKo ? '메이크업' : 'Makeup',
    catBody: isKo ? '바디' : 'Body',
    catHair: isKo ? '헤어' : 'Hair',
    priceUnder10k: isKo ? '~1만원' : '~₩10K',
    priceUnder30k: isKo ? '~3만원' : '~₩30K',
    priceUnder50k: isKo ? '~5만원' : '~₩50K',
    priceOver50k: isKo ? '5만원+' : '₩50K+',
    loadMore: isKo ? '더 보기' : 'Load More',
    searchTitle: isKo ? '검색' : 'Search',
  };

  const categories = [
    { value: 'skincare', label: t.catSkincare },
    { value: 'makeup', label: t.catMakeup },
    { value: 'body', label: t.catBody },
    { value: 'hair', label: t.catHair },
  ];

  const priceRanges: { value: PriceRange; label: string }[] = [
    { value: 'under10k', label: t.priceUnder10k },
    { value: 'under30k', label: t.priceUnder30k },
    { value: 'under50k', label: t.priceUnder50k },
    { value: 'over50k', label: t.priceOver50k },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'relevance', label: t.sortRelevance },
    { value: 'popular', label: t.sortPopular },
    { value: 'recent', label: t.sortRecent },
    { value: 'price_low', label: t.sortPriceLow },
    { value: 'price_high', label: t.sortPriceHigh },
    { value: 'rating', label: t.sortRating },
    { value: 'review', label: t.sortReview },
  ];

  const fetchResults = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedPriceRange) params.set('price', selectedPriceRange);
    params.set('sort', selectedSort);
    params.set('page', String(pageNum));
    params.set('limit', String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [q, selectedCategory, selectedPriceRange, selectedSort]);

  useEffect(() => {
    fetchResults(1, false);
  }, [fetchResults]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-2xl border border-border bg-card pl-12 pr-20 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('q');
                  router.push(`${pathname}?${params.toString()}`);
                }}
                className="absolute right-14 p-1 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-3 p-2 rounded-xl transition-colors ${
                showFilters ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 mb-6 p-4 rounded-2xl bg-card border border-border">
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                updateParam('category', val);
              }}
              allLabel={t.all}
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedPriceRange('');
                  updateParam('price', '');
                }}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                  !selectedPriceRange
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {t.all}
              </button>
              {priceRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => {
                    setSelectedPriceRange(range.value);
                    updateParam('price', range.value);
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                    selectedPriceRange === range.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort & Result Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {q && (
              <span>
                <span className="font-semibold text-foreground">&quot;{q}&quot;</span>{' '}
              </span>
            )}
            {total.toLocaleString()}{t.results}
          </p>
          <div className="flex gap-1.5 overflow-x-auto">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelectedSort(opt.value);
                  updateParam('sort', opt.value);
                }}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedSort === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-2xl bg-muted" />
                <div className="mt-2 h-4 rounded bg-muted w-3/4" />
                <div className="mt-1 h-3 rounded bg-muted w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
            {page < totalPages && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => fetchResults(page + 1, true)}
                  disabled={loading}
                  className="rounded-full border border-border bg-card px-8 py-2.5 text-sm font-medium hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : t.loadMore}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t.noResults}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t.tryAnother}</p>
          </div>
        )}
      </div>
    </div>
  );
}
