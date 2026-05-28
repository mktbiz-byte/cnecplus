'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/lib/hooks/use-user';
import { Globe, LogOut, Settings, User } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { NotificationBell } from '@/components/layout/notification-bell';
import { SearchBar } from '@/components/shop/SearchBar';

interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, signOut, isLoading } = useUser();

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="font-headline text-xl text-gold-gradient">
            CNEC
          </span>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Commerce
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchBar locale={locale} />

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {locales.map((l) => (
                <DropdownMenuItem key={l} asChild>
                  <Link
                    href={switchLocale(l)}
                    className={locale === l ? 'bg-accent/10 text-accent' : ''}
                  >
                    {localeNames[l]}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification Bell - all logged-in users */}
          {!isLoading && user && (
            <NotificationBell />
          )}

          {/* User Menu */}
          {!isLoading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full p-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="flex items-center gap-2 p-2">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/${user.role === 'super_admin' ? 'admin' : user.role === 'brand_admin' ? 'brand' : 'creator'}/dashboard`}>
                        <User className="mr-2 h-4 w-4" />
                        {t('nav.dashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/${user.role === 'super_admin' ? 'admin' : user.role === 'brand_admin' ? 'brand' : 'creator'}/settings`}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t('nav.settings')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('auth.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${locale}/login`}>{t('auth.login')}</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/signup?role=brand_admin`}>브랜드 입점</Link>
                  </Button>
                  <Button size="sm" asChild className="btn-gold">
                    <Link href={`/${locale}/signup?role=creator`}>크리에이터</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
