import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { locales } from '@/lib/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

function buildAlternates(path: string): MetadataRoute.Sitemap[number]['alternates'] {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 정적 페이지 (모든 locale)
  const staticPages = [
    { path: '/no-shop-context', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/refund-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.4 },
    { path: '/support', changeFrequency: 'yearly' as const, priority: 0.4 },
  ];

  const entries: MetadataRoute.Sitemap = staticPages.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}/ko${path}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: buildAlternates(path),
  }));

  try {
    const creators = await prisma.creator.findMany({
      where: {
        status: 'ACTIVE',
        shopId: { not: null },
      },
      select: { shopId: true, updatedAt: true },
    });

    for (const creator of creators) {
      entries.push({
        url: `${BASE_URL}/ko/${creator.shopId}`,
        lastModified: creator.updatedAt ? new Date(creator.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: buildAlternates(`/${creator.shopId}`),
      });
    }

    const shopItems = await prisma.creatorShopItem.findMany({
      where: { isVisible: true },
      select: { productId: true, creatorId: true },
      take: 5000,
    });

    if (shopItems.length > 0) {
      const creatorIds = [...new Set(shopItems.map(item => item.creatorId))];
      const productIds = [...new Set(shopItems.map(item => item.productId))];

      const [creatorsData, productsData] = await Promise.all([
        prisma.creator.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, shopId: true },
        }),
        prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, updatedAt: true },
        }),
      ]);

      const creatorMap = new Map(creatorsData.map(c => [c.id, c.shopId]));
      const productMap = new Map(productsData.map(p => [p.id, p.updatedAt]));

      const seen = new Set<string>();
      for (const item of shopItems) {
        const shopId = creatorMap.get(item.creatorId);
        const productUpdated = productMap.get(item.productId);
        if (!shopId || !item.productId) continue;

        const key = `${shopId}/${item.productId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const productPath = `/${shopId}/product/${item.productId}`;
        entries.push({
          url: `${BASE_URL}/ko${productPath}`,
          lastModified: productUpdated ? new Date(productUpdated) : now,
          changeFrequency: 'daily',
          priority: 0.7,
          alternates: buildAlternates(productPath),
        });
      }
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return entries;
}
