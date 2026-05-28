import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/products/similar?productId=xxx&limit=6
 * 유사 상품 추천: 같은 카테고리 + 같은 브랜드 우선
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 20);

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true, brandId: true },
  });

  if (!product) {
    return NextResponse.json({ products: [] });
  }

  // 1) 같은 카테고리 + 같은 브랜드 (최우선)
  // 2) 같은 카테고리 (차선)
  // 3) 같은 브랜드 (차선)
  const [sameBoth, sameCategory, sameBrand] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: productId },
        category: product.category,
        brandId: product.brandId,
      },
      include: { brand: { select: { id: true, brandName: true, logoUrl: true } } },
      orderBy: { reviewCount: 'desc' },
      take: limit,
    }),
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: productId },
        category: product.category,
        brandId: { not: product.brandId },
      },
      include: { brand: { select: { id: true, brandName: true, logoUrl: true } } },
      orderBy: { reviewCount: 'desc' },
      take: limit,
    }),
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: productId },
        brandId: product.brandId,
        category: { not: product.category },
      },
      include: { brand: { select: { id: true, brandName: true, logoUrl: true } } },
      orderBy: { reviewCount: 'desc' },
      take: limit,
    }),
  ]);

  // 병합 + 중복 제거 + limit 적용
  const seen = new Set<string>();
  const merged = [...sameBoth, ...sameCategory, ...sameBrand].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, limit);

  const products = merged.map((p) => ({
    id: p.id,
    name: p.name,
    nameKo: p.nameKo,
    thumbnailUrl: p.thumbnailUrl,
    images: p.images,
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    category: p.category,
    reviewCount: p.reviewCount,
    averageRating: p.averageRating ? Number(p.averageRating) : null,
    brand: p.brand ? {
      id: p.brand.id,
      brandName: p.brand.brandName,
      logoUrl: p.brand.logoUrl,
    } : null,
  }));

  const response = NextResponse.json({ products });
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return response;
}
