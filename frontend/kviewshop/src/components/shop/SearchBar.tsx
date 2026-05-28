'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, X, Users } from 'lucide-react';

interface Suggestion {
  products: {
    id: string;
    name: string | null;
    nameKo: string | null;
    thumbnailUrl: string | null;
    salePrice: number | null;
    brand: { brandName: string };
  }[];
  brands: {
    id: string;
    brandName: string;
    logoUrl: string | null;
  }[];
  creators?: {
    id: string;
    username: string | null;
    displayName: string | null;
    profileImageUrl: string | null;
    igFollowers: number | null;
  }[];
}

function highlightMatch(text: string, query: string) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function SearchBar({ locale }: { locale: string }) {
  const router = useRouter();
  const isKo = locale === 'ko';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions(null);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&suggest=true`);
      const data = await res.json();
      setSuggestions(data);
      setIsOpen(true);
    } catch {
      // ignore
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200);
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setShowInput(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (!query) setShowInput(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  // Focus input when shown
  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  function formatKRW(n: number) {
    return new Intl.NumberFormat('ko-KR').format(n);
  }

  const hasResults =
    suggestions &&
    (suggestions.products.length > 0 ||
      suggestions.brands.length > 0 ||
      (suggestions.creators && suggestions.creators.length > 0));

  return (
    <div ref={containerRef} className="relative">
      {showInput ? (
        <form onSubmit={handleSearch} className="flex items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => suggestions && setIsOpen(true)}
              placeholder={isKo ? '검색...' : 'Search...'}
              className="w-44 sm:w-56 rounded-full border border-border bg-card pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions(null);
                  setIsOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && hasResults && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card shadow-xl z-50">
          {/* Brand suggestions */}
          {suggestions!.brands.length > 0 && (
            <div className="p-2">
              <p className="px-2 text-xs font-medium text-muted-foreground mb-1">
                {isKo ? '브랜드' : 'Brands'}
              </p>
              {suggestions!.brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => {
                    router.push(`/${locale}/brands/${brand.id}`);
                    setIsOpen(false);
                    setShowInput(false);
                  }}
                  className="flex items-center gap-2 w-full rounded-xl px-2 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-md object-contain"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-muted" />
                  )}
                  <span className="font-medium">{highlightMatch(brand.brandName, query)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Creator suggestions */}
          {suggestions!.creators && suggestions!.creators.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="px-2 text-xs font-medium text-muted-foreground mb-1">
                {isKo ? '크리에이터' : 'Creators'}
              </p>
              {suggestions!.creators.map((creator) => (
                <button
                  key={creator.id}
                  onClick={() => {
                    router.push(`/${locale}/${creator.username}`);
                    setIsOpen(false);
                    setShowInput(false);
                  }}
                  className="flex items-center gap-3 w-full rounded-xl px-2 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {creator.profileImageUrl ? (
                    <Image
                      src={creator.profileImageUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">
                      {highlightMatch(creator.displayName || creator.username || '', query)}
                    </p>
                    {creator.username && (
                      <p className="text-xs text-muted-foreground">@{creator.username}</p>
                    )}
                  </div>
                  {creator.igFollowers && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFollowers(creator.igFollowers)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product suggestions */}
          {suggestions!.products.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="px-2 text-xs font-medium text-muted-foreground mb-1">
                {isKo ? '상품' : 'Products'}
              </p>
              {suggestions!.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    router.push(
                      `/${locale}/search?q=${encodeURIComponent(product.name || product.nameKo || '')}`,
                    );
                    setIsOpen(false);
                    setShowInput(false);
                  }}
                  className="flex items-center gap-3 w-full rounded-xl px-2 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {product.thumbnailUrl ? (
                    <Image
                      src={product.thumbnailUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-muted" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">
                      {highlightMatch(product.name || product.nameKo || '', query)}
                    </p>
                    <p className="text-xs text-muted-foreground">{product.brand.brandName}</p>
                  </div>
                  {product.salePrice && (
                    <span className="text-sm font-medium shrink-0">
                      {formatKRW(product.salePrice)}원
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search all */}
          {query && (
            <button
              onClick={handleSearch}
              className="w-full p-3 text-center text-sm text-primary font-medium border-t border-border hover:bg-muted/50 transition-colors"
            >
              &quot;{query}&quot; {isKo ? '전체 검색' : 'Search all'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
