import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

/**
 * 홈페이지 활성 공구 캠페인 (2분 캐시)
 */
export const getCachedActiveGonggu = unstable_cache(
  async () => {
    const campaigns = await prisma.campaign.findMany({
      where: {
        type: 'GONGGU',
        status: 'ACTIVE',
        isHidden: false,
        endAt: { gt: new Date() },
      },
      include: {
        brand: { select: { id: true, brandName: true, logoUrl: true } },
        products: {
          include: {
            product: {
              include: { brand: { select: { brandName: true } } },
            },
          },
        },
        participations: {
          where: { status: 'APPROVED' },
          include: {
            creator: { select: { shopId: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return campaigns;
  },
  ['active-gonggu'],
  { revalidate: 120, tags: ['campaigns'] },
);

/**
 * 인기 크리에이터 목록 (5분 캐시)
 */
export const getCachedTopCreators = unstable_cache(
  async () => {
    let creators = await prisma.creator.findMany({
      where: { totalSales: { gt: 0 } },
      orderBy: { totalSales: 'desc' },
      take: 10,
    });

    if (creators.length === 0) {
      creators = await prisma.creator.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    const creatorIds = creators.map((c) => c.id);
    if (creatorIds.length === 0) return [];

    const counts = await prisma.creatorShopItem.findMany({
      where: { creatorId: { in: creatorIds }, isVisible: true },
      select: { creatorId: true },
    });

    const countMap: Record<string, number> = {};
    counts.forEach((item) => {
      countMap[item.creatorId] = (countMap[item.creatorId] || 0) + 1;
    });

    return creators.map((c) => ({
      ...c,
      product_count: countMap[c.id] || 0,
    }));
  },
  ['top-creators'],
  { revalidate: 300, tags: ['creators'] },
);

/**
 * 인기 상품 목록 (2분 캐시)
 */
export const getCachedTopProducts = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        brand: { select: { id: true, brandName: true, logoUrl: true } },
      },
      orderBy: [{ reviewCount: 'desc' }, { averageRating: 'desc' }],
      take: 40,
    });
    return products;
  },
  ['top-products'],
  { revalidate: 120, tags: ['products'] },
);

/**
 * 브랜드 카테고리 목록 (10분 캐시)
 */
export const getCachedBrandCategories = unstable_cache(
  async () => {
    const brands = await prisma.brand.findMany({
      select: { id: true, brandName: true, logoUrl: true },
      orderBy: { brandName: 'asc' },
    });
    return brands;
  },
  ['brand-categories'],
  { revalidate: 600, tags: ['brands'] },
);
