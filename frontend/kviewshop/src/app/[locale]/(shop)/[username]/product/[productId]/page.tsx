import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ProductDetailPage } from '@/components/shop/product-detail';
import { ProductJsonLd } from '@/components/seo/JsonLd';
import { buildHreflangAlternates } from '@/lib/seo';
import { recordRecentView, getRecentViews } from '@/lib/actions/recent-view';
import { RecentViewsSection } from '@/components/shop/RecentViewsSection';
import { SimilarProducts } from '@/components/shop/SimilarProducts';
import type { Metadata } from 'next';
import type { Product, CampaignProduct, Creator } from '@/types/database';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

interface ProductPageProps {
  params: Promise<{
    locale: string;
    username: string;
    productId: string;
  }>;
  searchParams: Promise<{
    campaign?: string;
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

  if (!creator) return null;
  return creator;
}

async function getProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
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

  if (!product) return null;
  return product;
}

async function getCampaignProduct(productId: string, campaignId: string) {
  const campaignProduct = await prisma.campaignProduct.findFirst({
    where: {
      productId,
      campaignId,
    },
    include: {
      campaign: true,
    },
  });

  if (!campaignProduct) return null;
  return campaignProduct;
}

async function getCreatorProductContents(creatorId: string, productId: string) {
  try {
    const contents = await prisma.creatorProductContent.findMany({
      where: {
        creatorId,
        productId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    });
    return contents.map((c) => ({
      id: c.id,
      type: c.type,
      url: c.url,
      embedUrl: c.embedUrl,
      caption: c.caption,
      sortOrder: c.sortOrder,
    }));
  } catch {
    return [];
  }
}

async function getOtherProducts(creatorId: string, excludeProductId: string) {
  try {
    const shopItems = await prisma.creatorShopItem.findMany({
      where: {
        creatorId,
        isVisible: true,
        productId: { not: excludeProductId },
      },
      include: {
        product: true,
      },
      take: 6,
      orderBy: { displayOrder: 'asc' },
    });

    return shopItems
      .filter((item) => item.product)
      .map((item) => ({
        id: item.product!.id,
        name: item.product!.name || '',
        images: item.product!.images,
        salePrice: item.product!.salePrice ? Number(item.product!.salePrice) : 0,
        originalPrice: item.product!.originalPrice ? Number(item.product!.originalPrice) : 0,
      }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params, searchParams }: ProductPageProps): Promise<Metadata> {
  const { productId, username } = await params;
  const { campaign: campaignId } = await searchParams;
  const [product, creator] = await Promise.all([
    getProduct(productId),
    getCreatorByShopId(username),
  ]);

  if (!product) {
    return { title: '상품을 찾을 수 없습니다' };
  }

  const brandName = product.brand?.brandName || '';
  const shopName = creator?.displayName || username;
  const originalPrice = Number(product.originalPrice || 0);
  const salePrice = Number(product.salePrice || 0);
  const discountPercent = originalPrice > salePrice
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;
  const priceText = new Intl.NumberFormat('ko-KR').format(salePrice);
  const ogImage = product.thumbnailUrl || product.images?.[0];
  const canonicalUrl = `${BASE_URL}/${username}/product/${productId}`;

  // Check if this is a gonggu campaign product
  let campaignProduct: any = null;
  if (campaignId) {
    campaignProduct = await getCampaignProduct(productId, campaignId);
  }
  const campaign = campaignProduct?.campaign;
  const isGonggu = !!campaign && campaign.type === 'GONGGU';

  // Build gonggu-aware title
  let ogTitle: string;
  if (isGonggu && campaign?.endAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(campaign.endAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const campaignPrice = Number(campaignProduct?.campaignPrice ?? salePrice);
    const gongguDiscount = Math.round(((originalPrice - campaignPrice) / originalPrice) * 100);
    ogTitle = `D-${daysLeft} ${product.name} ${gongguDiscount}% 공구`;
  } else {
    const titleSuffix = discountPercent > 0 ? ` - ${discountPercent}% OFF` : '';
    ogTitle = `${product.name}${titleSuffix} — ${shopName}`;
  }

  const ogDesc = isGonggu
    ? `한정 수량 | ${shopName}의 셀렉트샵`
    : `${brandName} ${product.name} ${priceText}원`;

  return {
    title: `${product.name} | CNEC`,
    description: ogDesc,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflangAlternates(`/${username}/product/${productId}`),
    },
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url: canonicalUrl,
      images: [
        {
          url: `${BASE_URL}/api/og/product?${new URLSearchParams({
            name: product.name || '',
            brand: brandName,
            price: `${priceText}원`,
            discount: discountPercent > 0 ? String(discountPercent) : '',
            image: ogImage || '',
            shop: String(shopName),
          })}`,
          width: 1200,
          height: 630,
          alt: product.name || '',
        },
      ],
      type: 'website',
      siteName: 'CNEC Commerce',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
      images: [
        `${BASE_URL}/api/og/product?${new URLSearchParams({
          name: product.name || '',
          brand: brandName,
          price: `${priceText}원`,
          discount: discountPercent > 0 ? String(discountPercent) : '',
          image: ogImage || '',
          shop: String(shopName),
        })}`,
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { locale, username, productId } = await params;
  const { campaign: campaignId } = await searchParams;

  const [creator, product] = await Promise.all([
    getCreatorByShopId(username),
    getProduct(productId),
  ]);

  if (!creator || !product) {
    notFound();
  }

  // 최근 본 상품 기록
  recordRecentView(creator.id, productId).catch(() => {});

  let campaignProduct: any = null;
  if (campaignId) {
    campaignProduct = await getCampaignProduct(productId, campaignId);
  }

  // Fetch other products, creator contents, reels info, and recent views in parallel
  const [otherProducts, creatorContents, shopItemReels, recentViews] = await Promise.all([
    getOtherProducts(creator.id, productId),
    getCreatorProductContents(creator.id, productId),
    prisma.creatorShopItem.findFirst({
      where: { creatorId: creator.id, productId, isVisible: true },
      select: { reelsUrl: true, reelsCaption: true },
    }),
    getRecentViews(creator.id, 10).catch(() => []),
  ]);

  // 현재 상품은 제외
  const filteredRecentViews = recentViews.filter(
    (v) => v.productId !== productId
  );

  // Serialize Decimal fields before passing to client components
  const serializedProduct = {
    ...product,
    price: product.price ? Number(product.price) : null,
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    salePrice: product.salePrice ? Number(product.salePrice) : null,
    defaultCommissionRate: Number(product.defaultCommissionRate),
    shippingFee: Number(product.shippingFee),
    freeShippingThreshold: product.freeShippingThreshold
      ? Number(product.freeShippingThreshold)
      : null,
  };

  const serializedCreator = {
    ...creator,
    totalSales: Number(creator.totalSales),
    totalEarnings: Number(creator.totalEarnings),
    totalRevenue: Number(creator.totalRevenue),
  };

  const serializedCampaignProduct = campaignProduct
    ? {
        ...campaignProduct,
        campaignPrice: Number(campaignProduct.campaignPrice),
        campaign: campaignProduct.campaign
          ? {
              ...campaignProduct.campaign,
              commissionRate: Number(campaignProduct.campaign.commissionRate),
            }
          : undefined,
      }
    : null;

  const productUrl = `${BASE_URL}/${username}/product/${productId}`;

  return (
    <>
      <ProductJsonLd product={serializedProduct as unknown as Product} shopUrl={productUrl} />
      <ProductDetailPage
        product={serializedProduct as unknown as Product}
        campaignProduct={serializedCampaignProduct as unknown as CampaignProduct | null}
        creator={serializedCreator as unknown as Creator}
        locale={locale}
        username={username}
        otherProducts={otherProducts}
        creatorContents={creatorContents}
        reelsUrl={shopItemReels?.reelsUrl}
        reelsCaption={shopItemReels?.reelsCaption}
      />
      <div className="max-w-[480px] mx-auto">
        <SimilarProducts productId={productId} locale={locale} />
      </div>
      {filteredRecentViews.length > 0 && (
        <div className="max-w-[480px] mx-auto">
          <RecentViewsSection
            items={filteredRecentViews as any}
            shopUsername={username}
            locale={locale}
          />
        </div>
      )}
    </>
  );
}
