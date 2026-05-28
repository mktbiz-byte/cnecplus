import { MainBottomNav } from '@/components/shop/MainBottomNav';

interface ShopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const { locale } = await params;

  return (
    <>
      {children}
      <MainBottomNav locale={locale} />
    </>
  );
}
