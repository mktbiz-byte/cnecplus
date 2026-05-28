import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, isRTL, type Locale } from '@/lib/i18n/config';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { ChatbotWidget } from '@/components/shop/ChatbotWidget';
import { CookieConsent } from '@/components/shop/CookieConsent';
import { ServiceWorkerRegister } from '@/components/shop/ServiceWorkerRegister';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRTL(locale as Locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          defer
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary"
        >
          {locale === 'ko' ? '본문으로 건너뛰기' : 'Skip to content'}
        </a>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <main id="main-content">{children}</main>
          </Providers>
        </NextIntlClientProvider>
        <Toaster />
        <ChatbotWidget locale={locale} />
        <CookieConsent locale={locale} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
