import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { CreatorShopPage } from '@/components/shop/creator-shop';
import type { ShopCreator, ShopItem, ShopCollection } from '@/components/shop/creator-shop';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';
import { buildHreflangAlternates } from '@/lib/seo';
import { recordShopVisit } from '@/lib/actions/shop-visit';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

interface ShopPageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
}

async function getCreatorByShopId(shopId: string) {
  const creator = await prisma.creator.findFirst({
    where: {
      shopId: {
        equals: shopId,
        mode: 'insensitive',
      },
    },
  });

  return creator;
}

async function getShopItems(creatorId: string) {
  try {
    const items = await prisma.creatorShopItem.findMany({
      where: {
        creatorId,
        isVisible: true,
        // Product must be ACTIVE
        product: {
          status: 'ACTIVE',
        },
        // Campaign (if linked) must be ACTIVE — exclude DRAFT/ENDED/RECRUITING
        OR: [
          { campaignId: null },  // PICK items without campaign
          { campaign: { status: 'ACTIVE', isHidden: false } },  // Campaign items with ACTIVE, visible campaign
        ],
      },
      include: {
        product: {
          include: {
            brand: {
              select: {
                id: true,
                brandName: true,
                logoUrl: true,
              },
            },
          },
        },
        campaign: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    // Fetch campaign product prices for GONGGU items
    const campaignProductIds = items
      .filter((item) => item.campaignId && item.type === 'GONGGU')
      .map((item) => ({ campaignId: item.campaignId!, productId: item.productId }));

    let campaignProductMap: Record<string, { campaignPrice: number | null }> = {};

    if (campaignProductIds.length > 0) {
      const campaignProducts = await prisma.campaignProduct.findMany({
        where: {
          OR: campaignProductIds.map((cp) => ({
            campaignId: cp.campaignId,
            productId: cp.productId,
          })),
        },
      });

      for (const cp of campaignProducts) {
        campaignProductMap[`${cp.campaignId}-${cp.productId}`] = {
          campaignPrice: cp.campaignPrice ? Number(cp.campaignPrice) : null,
        };
      }
    }

    // Serialize Decimal fields to numbers and attach campaignProduct data
    return items.map((item) => ({
      ...item,
      product: item.product
        ? {
            ...item.product,
            price: item.product.price ? Number(item.product.price) : null,
            originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : null,
            salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
            defaultCommissionRate: Number(item.product.defaultCommissionRate),
            shippingFee: Number(item.product.shippingFee),
            freeShippingThreshold: item.product.freeShippingThreshold
              ? Number(item.product.freeShippingThreshold)
              : null,
          }
        : null,
      campaign: item.campaign
        ? {
            ...item.campaign,
            commissionRate: Number(item.campaign.commissionRate),
          }
        : null,
      campaignProduct: item.campaignId
        ? campaignProductMap[`${item.campaignId}-${item.productId}`] ?? null
        : null,
    }));
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return [];
  }
}

async function getCollections(creatorId: string) {
  try {
    const collections = await prisma.collection.findMany({
      where: {
        creatorId,
        isVisible: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return collections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByShopId(username);

  if (!creator) {
    return {
      title: 'Shop Not Found',
    };
  }

  const displayName = creator.displayName || creator.shopId;

  const shopDesc = creator.bio || `${displayName}이(가) 추천하는 K-뷰티 아이템을 만나보세요`;
  const ogImage = creator.coverImageUrl || creator.profileImageUrl;

  const canonicalUrl = `${BASE_URL}/${username}`;

  return {
    title: `${displayName}의 K-뷰티 샵 — CNEC`,
    description: shopDesc,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflangAlternates(`/${username}`),
    },
    openGraph: {
      title: `${displayName}의 K-뷰티 샵`,
      description: shopDesc,
      url: canonicalUrl,
      images: [
        {
          url: `${BASE_URL}/api/og/shop?${new URLSearchParams({
            name: String(displayName),
            bio: creator.bio || '',
            image: creator.profileImageUrl || '',
            followers: creator.igFollowers ? new Intl.NumberFormat('en', { notation: 'compact' }).format(creator.igFollowers) : '',
          })}`,
          width: 1200,
          height: 630,
          alt: `${displayName}의 K-뷰티 샵`,
        },
      ],
      type: 'website',
      siteName: 'CNEC Commerce',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}의 K-뷰티 샵`,
      description: shopDesc,
      images: [
        `${BASE_URL}/api/og/shop?${new URLSearchParams({
          name: String(displayName),
          bio: creator.bio || '',
          image: creator.profileImageUrl || '',
        })}`,
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { username, locale } = await params;
  const creator = await getCreatorByShopId(username);

  if (!creator) {
    notFound();
  }

  // 샵 방문 기록
  recordShopVisit(creator.id).catch(() => {});

  const session = await auth();
  const isLoggedIn = !!(session?.user?.id && session.user.role === 'buyer');

  const [shopItems, collections] = await Promise.all([
    getShopItems(creator.id),
    getCollections(creator.id),
  ]);

  // 찜 목록 한 번에 조회 (N+1 방지)
  let wishlistedProductIds: string[] = [];
  if (isLoggedIn) {
    try {
      const buyer = await prisma.buyer.findUnique({
        where: { userId: session!.user!.id },
        select: { id: true },
      });
      if (buyer) {
        const productIds = shopItems.map((item) => item.productId);
        const wishes = await prisma.buyerWishlist.findMany({
          where: {
            buyerId: buyer.id,
            creatorId: creator.id,
            productId: { in: productIds },
          },
          select: { productId: true },
        });
        wishlistedProductIds = wishes.map((w) => w.productId);
      }
    } catch {
      // 찜 조회 실패가 메인 로직에 영향 주지 않도록
    }
  }

  // Serialize Decimal fields on creator before passing to client component
  const serializedCreator = {
    ...creator,
    totalSales: Number(creator.totalSales),
    totalEarnings: Number(creator.totalEarnings),
    totalRevenue: Number(creator.totalRevenue),
  };

  const shopUrl = `${BASE_URL}/${username}`;

  return (
    <>
      <OrganizationJsonLd
        name={creator.displayName || creator.shopId || ''}
        url={shopUrl}
        imageUrl={creator.profileImageUrl || undefined}
        description={creator.bio || undefined}
      />
      <CreatorShopPage
        creator={serializedCreator as ShopCreator}
        shopItems={shopItems as ShopItem[]}
        collections={collections as ShopCollection[]}
        locale={locale}
        wishlistedProductIds={wishlistedProductIds}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
