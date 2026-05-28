import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';

/**
 * GET /api/me/recent-views?limit=10
 * 로그인 유저의 최근 본 상품 (전체 샵 통합)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  const authUser = await getAuthUser();

  // buyerId 또는 cookieKey로 조회
  let buyerId: string | null = null;
  let cookieKey: string | null = null;

  if (authUser) {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });
    buyerId = buyer?.id || null;
  }

  if (!buyerId) {
    const cookieStore = await cookies();
    cookieKey = cookieStore.get('guest_view_key')?.value || null;
  }

  if (!buyerId && !cookieKey) {
    return NextResponse.json({ items: [] });
  }

  const where: Record<string, unknown> = {};
  if (buyerId) where.buyerId = buyerId;
  else where.cookieKey = cookieKey;

  const views = await prisma.recentView.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          salePrice: true,
          images: true,
        },
      },
    },
    orderBy: { viewedAt: 'desc' },
    take: limit,
  });

  const items = views
    .filter((v) => v.product)
    .map((v) => ({
      id: v.id,
      productId: v.productId,
      product: {
        id: v.product!.id,
        name: v.product!.name,
        thumbnailUrl: v.product!.thumbnailUrl,
        salePrice: v.product!.salePrice ? Number(v.product!.salePrice) : null,
        images: v.product!.images as string[],
      },
      creator: { shopId: v.shopId },
    }));

  return NextResponse.json({ items });
}
