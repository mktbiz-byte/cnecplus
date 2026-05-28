import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/products/popular?limit=12&category=skincare
 * 인기 상품 랭킹: 리뷰 수 * 2 + 평점 * 10 기반 점수
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50);
  const category = searchParams.get('category') || '';

  const where: Record<string, unknown> = { status: 'ACTIVE' };
  if (category) where.category = category;

  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { id: true, brandName: true, logoUrl: true } },
    },
    orderBy: [
      { reviewCount: 'desc' },
      { averageRating: 'desc' },
    ],
    take: limit,
  });

  const ranked = products.map((p, idx) => ({
    rank: idx + 1,
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
    score: (p.reviewCount * 2) + (p.averageRating ? Number(p.averageRating) * 10 : 0),
  }));

  const response = NextResponse.json({ products: ranked });
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return response;
}
