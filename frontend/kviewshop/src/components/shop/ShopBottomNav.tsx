'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCartItemCount } from '@/lib/actions/cart';
import { getWishlistCount } from '@/lib/actions/wishlist';
import { resolveCreatorId } from '@/lib/actions/shop-resolve';

interface ShopBottomNavProps {
  locale: string;
  username: string;
}

export function ShopBottomNav({ locale, username }: ShopBottomNavProps) {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      try {
        const creatorId = await resolveCreatorId(username);
        if (!creatorId || cancelled) return;
        const [cc, wc] = await Promise.all([
          getCartItemCount(creatorId),
          getWishlistCount(creatorId),
        ]);
        if (!cancelled) {
          setCartCount(cc);
          setWishlistCount(wc);
        }
      } catch {
        // ignore
      }
    }
    loadCounts();
    return () => { cancelled = true; };
  }, [username, pathname]);

  // Hide on checkout and order-complete pages (they have their own CTAs)
  if (
    pathname.includes('/checkout') ||
    pathname.includes('/order-complete')
  ) {
    return null;
  }

  const navItems = [
    {
      href: `/${locale}/${username}`,
      icon: Home,
      label: '홈',
      badge: 0,
      isActive: pathname === `/${locale}/${username}` || pathname === `/${locale}/${username}/`,
    },
    {
      href: `/${locale}/${username}/cart`,
      icon: ShoppingBag,
      label: '카트',
      badge: cartCount,
      isActive: pathname.includes(`/${username}/cart`),
    },
    {
      href: `/${locale}/my/wishlist`,
      icon: Heart,
      label: '찜',
      badge: wishlistCount,
      isActive: pathname.includes('/my/wishlist'),
    },
    {
      href: `/${locale}/my`,
      icon: User,
      label: '마이',
      badge: 0,
      isActive: pathname.endsWith('/my') || (pathname.includes('/my/') && !pathname.includes('/wishlist') && !pathname.includes('/recent')),
    },
  ];

  return (
    <nav
      aria-label="샵 네비게이션"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E5EA] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-4 h-[56px] max-w-[480px] mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 relative"
          >
            <div className="relative">
              <item.icon
                className={`h-5 w-5 ${item.isActive ? 'text-[#1A1A1A]' : 'text-[#8E8E93]'}`}
              />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] ${item.isActive ? 'text-[#1A1A1A] font-medium' : 'text-[#8E8E93]'}`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
