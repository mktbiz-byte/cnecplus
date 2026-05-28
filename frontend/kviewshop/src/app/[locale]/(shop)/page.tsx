import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { LegalFooter } from '@/components/shop/legal-footer';
import { BuyerHomePage } from '@/components/buyer/BuyerHomePage';
import { buildHreflangAlternates } from '@/lib/seo';

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

async function getActiveGonggu() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      type: 'GONGGU',
      status: 'ACTIVE',
      isHidden: false,
      endAt: {
        gt: new Date(),
      },
    },
    include: {
      brand: {
        select: {
          id: true,
          brandName: true,
          logoUrl: true,
        },
      },
      products: {
        include: {
          product: {
            include: {
              brand: {
                select: {
                  brandName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  return campaigns;
}

async function getTopCreators() {
  let creators = await prisma.creator.findMany({
    where: {
      totalSales: {
        gt: 0,
      },
    },
    orderBy: {
      totalSales: 'desc',
    },
    take: 10,
  });

  if (creators.length === 0) {
    creators = await prisma.creator.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  }

  const creatorIds = creators.map((c) => c.id);
  if (creatorIds.length === 0) return [];

  const counts = await prisma.creatorShopItem.findMany({
    where: {
      creatorId: { in: creatorIds },
      isVisible: true,
    },
    select: {
      creatorId: true,
    },
  });

  const countMap: Record<string, number> = {};
  counts.forEach((item) => {
    countMap[item.creatorId] = (countMap[item.creatorId] || 0) + 1;
  });

  return creators.map((c) => ({
    ...c,
    product_count: countMap[c.id] || 0,
  }));
}

async function getTopProducts() {
  const orderItems = await prisma.orderItem.findMany({
    select: {
      productId: true,
      quantity: true,
    },
    take: 200,
  });

  if (orderItems.length > 0) {
    const salesMap: Record<string, number> = {};
    orderItems.forEach((item) => {
      if (item.productId) {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
      }
    });

    const topIds = Object.entries(salesMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    if (topIds.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: topIds },
          status: 'ACTIVE',
        },
        include: {
          brand: {
            select: {
              id: true,
              brandName: true,
              logoUrl: true,
            },
          },
        },
      });

      if (products.length > 0) {
        const sorted = [...products].sort(
          (a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0)
        );
        return sorted;
      }
    }
  }

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      brand: {
        select: {
          id: true,
          brandName: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  return products;
}

export default async function DiscoveryPage({ params }: PageProps) {
  const { locale } = await params;

  const [gongguCampaigns, topCreators, topProducts] = await Promise.all([
    getActiveGonggu(),
    getTopCreators(),
    getTopProducts(),
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
