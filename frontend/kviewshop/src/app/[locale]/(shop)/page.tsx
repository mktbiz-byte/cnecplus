import type { Metadata } from 'next';
import { LegalFooter } from '@/components/shop/legal-footer';
import { BuyerHomePage } from '@/components/buyer/BuyerHomePage';
import { buildHreflangAlternates } from '@/lib/seo';
import { getCachedActiveGonggu, getCachedTopCreators, getCachedTopProducts } from '@/lib/cache';

export const revalidate = 120;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === 'ko';
  return {
    title: isKo ? '크넥 — K-뷰티 크리에이터 셀렉트샵' : 'CNEC — K-Beauty Creator Select Shop',
    description: isKo
      ? '크리에이터가 직접 고른 K-뷰티 추천템을 만나보세요'
      : 'Discover K-beauty products handpicked by creators',
    alternates: {
      languages: buildHreflangAlternates('/no-shop-context'),
    },
    openGraph: {
      title: isKo ? '크넥 — K-뷰티 크리에이터 셀렉트샵' : 'CNEC — K-Beauty Creator Select Shop',
      description: isKo
        ? '크리에이터가 직접 고른 K-뷰티 추천템을 만나보세요'
        : 'Discover K-beauty products handpicked by creators',
      type: 'website',
      siteName: 'CNEC Commerce',
    },
  };
}

export default async function DiscoveryPage({ params }: PageProps) {
  const { locale } = await params;

  const [gongguCampaigns, topCreators, topProducts] = await Promise.all([
    getCachedActiveGonggu(),
    getCachedTopCreators(),
    getCachedTopProducts(),
  ]);

  // Serialize data for client component (Decimal -> number, Date -> string)
  const serializedCreators = topCreators.map(c => ({
    id: c.id,
    username: c.username ?? null,
    shopId: c.shopId ?? null,
    displayName: c.displayName ?? null,
    profileImageUrl: c.profileImageUrl ?? null,
    product_count: c.product_count,
  }));

  const serializedGonggu = gongguCampaigns.map(campaign => ({
    id: campaign.id,
    title: campaign.title,
    endAt: campaign.endAt ? campaign.endAt.toISOString() : null,
    brand: campaign.brand ? {
      brandName: campaign.brand.brandName,
      logoUrl: campaign.brand.logoUrl ?? null,
    } : null,
    creatorShopId: (campaign as any).participations?.[0]?.creator?.shopId ?? null,
    products: campaign.products.map(cp => ({
      campaignPrice: Number(cp.campaignPrice),
      product: {
        id: cp.product.id,
        name: cp.product.name,
        thumbnailUrl: cp.product.thumbnailUrl ?? null,
        imageUrl: cp.product.imageUrl ?? null,
        images: (cp.product.images as string[]) ?? [],
        originalPrice: Number(cp.product.originalPrice ?? 0),
        salePrice: Number(cp.product.salePrice ?? 0),
        category: cp.product.category ?? null,
        brand: cp.product.brand
          ? { brandName: cp.product.brand.brandName }
          : null,
      },
    })),
  }));

  const serializedProducts = topProducts.map(product => ({
    id: product.id,
    name: product.name,
    thumbnailUrl: product.thumbnailUrl ?? null,
    imageUrl: product.imageUrl ?? null,
    images: (product.images as string[]) ?? [],
    originalPrice: Number(product.originalPrice ?? 0),
    salePrice: Number(product.salePrice ?? 0),
    category: product.category ?? null,
    brand: product.brand ? {
      brandName: product.brand.brandName,
      logoUrl: product.brand.logoUrl ?? null,
    } : null,
  }));

  return (
    <>
      <BuyerHomePage
        locale={locale}
        creators={serializedCreators}
        gongguCampaigns={serializedGonggu}
        topProducts={serializedProducts}
      />
      <LegalFooter locale={locale} variant="minimal" />
    </>
  );
}
