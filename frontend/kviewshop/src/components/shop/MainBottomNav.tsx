'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Grid3X3, User } from 'lucide-react';

interface MainBottomNavProps {
  locale: string;
}

// 플랫폼 경로 prefix — 이 경로들은 크리에이터 샵이 아닌 플랫폼 페이지
const PLATFORM_PATHS = [
  'no-shop-context', 'search', 'creators', 'brands', 'my',
  'products', 'orders', 'content', 'discovery',
  'terms', 'privacy', 'refund-policy', 'faq', 'support',
  'signup', 'login', 'admin', 'brand', 'creator', 'buyer',
];

function isCreatorShopPath(pathname: string, locale: string): boolean {
  // /{locale}/xxx 형태에서 xxx가 플랫폼 경로가 아니면 크리에이터 샵
  const afterLocale = pathname.replace(`/${locale}`, '').replace(/^\//, '').split('/')[0];
  if (!afterLocale) return false;
  return !PLATFORM_PATHS.includes(afterLocale);
}

export function MainBottomNav({ locale }: MainBottomNavProps) {
  const pathname = usePathname();

  // 크리에이터 샵 안에서는 ShopBottomNav 사용
  if (isCreatorShopPath(pathname, locale)) return null;

  // checkout, order-complete, cart에서는 숨김
  if (
    pathname.includes('/checkout') ||
    pathname.includes('/order-complete') ||
    pathname.includes('/cart')
  ) {
    return null;
  }

  const navItems = [
    {
      href: `/${locale}/no-shop-context`,
      icon: Home,
      label: '홈',
      isActive:
        pathname === `/${locale}` ||
        pathname === `/${locale}/` ||
        pathname.endsWith('/no-shop-context'),
    },
    {
      href: `/${locale}/search`,
      icon: Search,
      label: '검색',
      isActive: pathname.includes('/search'),
    },
    {
      href: `/${locale}/creators`,
      icon: Grid3X3,
      label: '크리에이터',
      isActive: pathname.includes('/creators') || pathname.includes('/brands'),
    },
    {
      href: `/${locale}/my`,
      icon: User,
      label: '마이',
      isActive: pathname.includes('/my'),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E5EA] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-4 h-[56px] max-w-lg mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5"
          >
            <item.icon
              className={`h-5 w-5 transition-colors ${
                item.isActive ? 'text-[#1A1A1A]' : 'text-[#8E8E93]'
              }`}
            />
            <span
              className={`text-[10px] transition-colors ${
                item.isActive ? 'text-[#1A1A1A] font-medium' : 'text-[#8E8E93]'
              }`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
