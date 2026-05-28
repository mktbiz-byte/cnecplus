import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const priceRange = searchParams.get('price') || '';
  const sort = searchParams.get('sort') || 'popular';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const suggest = searchParams.get('suggest') === 'true';

  // ─── Autocomplete (suggest) mode ───
  if (suggest && q && q.length >= 1) {
    return handleSuggest(q);
  }

  // ─── Full search mode ───
  return handleFullSearch(q, category, brand, priceRange, sort, page, limit);
}

/**
 * 자동완성: trigram similarity + ILIKE 혼합
 * 상품, 브랜드, 크리에이터 모두 검색
 */
async function handleSuggest(q: string) {
  const safeQ = q.replace(/[%_\\]/g, '\\$&');

  // 상품: ILIKE 우선 + trigram similarity 보조
  const products: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT id, name, name_ko AS "nameKo", thumbnail_url AS "thumbnailUrl",
           sale_price AS "salePrice", b.brand_name AS "brandName",
           GREATEST(
             similarity(COALESCE(p.name, ''), $1),
             similarity(COALESCE(p.name_ko, ''), $1)
           ) AS sim
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.status = 'ACTIVE'
      AND (
        p.name ILIKE $2
        OR p.name_ko ILIKE $2
        OR p.name_en ILIKE $2
        OR similarity(COALESCE(p.name, ''), $1) > 0.15
        OR similarity(COALESCE(p.name_ko, ''), $1) > 0.15
      )
    ORDER BY
      CASE WHEN p.name ILIKE $2 OR p.name_ko ILIKE $2 THEN 0 ELSE 1 END,
      sim DESC,
      p.review_count DESC
    LIMIT 8
    `,
    q,
    `%${safeQ}%`,
  );

  // 브랜드
  const brands: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT id, brand_name AS "brandName", logo_url AS "logoUrl",
           similarity(brand_name, $1) AS sim
    FROM brands
    WHERE brand_name ILIKE $2
      OR similarity(brand_name, $1) > 0.2
    ORDER BY
      CASE WHEN brand_name ILIKE $2 THEN 0 ELSE 1 END,
      sim DESC
    LIMIT 4
    `,
    q,
    `%${safeQ}%`,
  );

  // 크리에이터
  const creators: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT id, username, display_name AS "displayName",
           profile_image_url AS "profileImageUrl",
           ig_followers AS "igFollowers",
           GREATEST(
             similarity(COALESCE(display_name, ''), $1),
             similarity(COALESCE(username, ''), $1)
           ) AS sim
    FROM creators
    WHERE status = 'ACTIVE'
      AND shop_id IS NOT NULL
      AND (
        display_name ILIKE $2
        OR username ILIKE $2
        OR ig_username ILIKE $2
        OR similarity(COALESCE(display_name, ''), $1) > 0.2
        OR similarity(COALESCE(username, ''), $1) > 0.2
      )
    ORDER BY
      CASE WHEN display_name ILIKE $2 OR username ILIKE $2 THEN 0 ELSE 1 END,
      sim DESC,
      ig_followers DESC NULLS LAST
    LIMIT 4
    `,
    q,
    `%${safeQ}%`,
  );

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameKo: p.nameKo,
      thumbnailUrl: p.thumbnailUrl,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      brand: { brandName: p.brandName || '' },
    })),
    brands,
    creators: creators.map((c) => ({
      ...c,
      igFollowers: c.igFollowers ? Number(c.igFollowers) : null,
    })),
  });
}

/**
 * 전체 검색: trigram similarity 기반 관련성 랭킹
 */
async function handleFullSearch(
  q: string | null | undefined,
  category: string,
  brand: string,
  priceRange: string,
  sort: string,
  page: number,
  limit: number,
) {
  // q가 없으면 기존 Prisma 쿼리로 폴백
  if (!q) {
    return handleFilterOnlySearch(category, brand, priceRange, sort, page, limit);
  }

  const safeQ = q.replace(/[%_\\]/g, '\\$&');
  const offset = (page - 1) * limit;

  // 동적 WHERE 절 구성
  const conditions: string[] = [
    "p.status = 'ACTIVE'",
    `(
      p.name ILIKE $1
      OR p.name_ko ILIKE $1
      OR p.name_en ILIKE $1
      OR p.description ILIKE $1
      OR p.description_ko ILIKE $1
      OR b.brand_name ILIKE $1
      OR similarity(COALESCE(p.name, ''), $2) > 0.15
      OR similarity(COALESCE(p.name_ko, ''), $2) > 0.15
    )`,
  ];
  const params: any[] = [`%${safeQ}%`, q];

  if (category) {
    params.push(category);
    conditions.push(`p.category = $${params.length}`);
  }
  if (brand) {
    params.push(brand);
    conditions.push(`p.brand_id = $${params.length}`);
  }
  if (priceRange) {
    switch (priceRange) {
      case 'under10k':
        conditions.push('p.sale_price <= 10000');
        break;
      case 'under30k':
        conditions.push('p.sale_price <= 30000');
        break;
      case 'under50k':
        conditions.push('p.sale_price <= 50000');
        break;
      case 'over50k':
        conditions.push('p.sale_price > 50000');
        break;
    }
  }

  const whereClause = conditions.join(' AND ');

  // 정렬
  let orderClause: string;
  switch (sort) {
    case 'recent':
      orderClause = 'p.created_at DESC';
      break;
    case 'price_low':
      orderClause = 'p.sale_price ASC NULLS LAST';
      break;
    case 'price_high':
      orderClause = 'p.sale_price DESC NULLS LAST';
      break;
    case 'rating':
      orderClause = 'p.average_rating DESC NULLS LAST';
      break;
    case 'review':
      orderClause = 'p.review_count DESC';
      break;
    case 'relevance':
    default:
      // 관련성: 이름 정확 매치 > similarity 점수 > 리뷰 수
      orderClause = `
        CASE WHEN p.name ILIKE $1 OR p.name_ko ILIKE $1 THEN 0 ELSE 1 END,
        GREATEST(
          similarity(COALESCE(p.name, ''), $2),
          similarity(COALESCE(p.name_ko, ''), $2)
        ) DESC,
        p.review_count DESC
      `;
      break;
  }

  // popular도 relevance와 동일하게 관련성 우선
  if (sort === 'popular') {
    orderClause = `
      CASE WHEN p.name ILIKE $1 OR p.name_ko ILIKE $1 THEN 0 ELSE 1 END,
      GREATEST(
        similarity(COALESCE(p.name, ''), $2),
        similarity(COALESCE(p.name_ko, ''), $2)
      ) DESC,
      p.review_count DESC
    `;
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const [products, countResult] = await Promise.all([
    prisma.$queryRawUnsafe(
      `
      SELECT p.id, p.name, p.name_ko, p.name_en, p.name_jp,
             p.description, p.description_ko, p.description_en, p.description_jp,
             p.thumbnail_url, p.images, p.category, p.sub_category,
             p.price, p.original_price, p.sale_price,
             p.default_commission_rate, p.shipping_fee, p.free_shipping_threshold,
             p.stock, p.status, p.is_active, p.review_count, p.average_rating,
             p.created_at, p.updated_at,
             b.id AS brand_id, b.brand_name, b.logo_url
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      ...params,
    ) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE ${whereClause}`,
      ...params.slice(0, -2),
    ) as Promise<any[]>,
  ]);

  const total = countResult[0]?.total || 0;

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameKo: p.name_ko,
      nameEn: p.name_en,
      nameJp: p.name_jp,
      description: p.description,
      descriptionKo: p.description_ko,
      descriptionEn: p.description_en,
      descriptionJp: p.description_jp,
      thumbnailUrl: p.thumbnail_url,
      images: p.images,
      category: p.category,
      subCategory: p.sub_category,
      price: p.price ? Number(p.price) : null,
      originalPrice: p.original_price ? Number(p.original_price) : null,
      salePrice: p.sale_price ? Number(p.sale_price) : null,
      defaultCommissionRate: Number(p.default_commission_rate),
      shippingFee: Number(p.shipping_fee),
      freeShippingThreshold: p.free_shipping_threshold ? Number(p.free_shipping_threshold) : null,
      stock: p.stock,
      status: p.status,
      isActive: p.is_active,
      reviewCount: p.review_count,
      averageRating: p.average_rating ? Number(p.average_rating) : null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      brand: {
        id: p.brand_id,
        brandName: p.brand_name,
        logoUrl: p.logo_url,
      },
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * 검색어 없이 필터만 사용하는 경우 (기존 Prisma 쿼리)
 */
async function handleFilterOnlySearch(
  category: string,
  brand: string,
  priceRange: string,
  sort: string,
  page: number,
  limit: number,
) {
  const where: any = { status: 'ACTIVE' };

  if (category) where.category = category;
  if (brand) where.brandId = brand;
  if (priceRange) {
    switch (priceRange) {
      case 'under10k': where.salePrice = { lte: 10000 }; break;
      case 'under30k': where.salePrice = { lte: 30000 }; break;
      case 'under50k': where.salePrice = { lte: 50000 }; break;
      case 'over50k': where.salePrice = { gt: 50000 }; break;
    }
  }

  let orderBy: any;
  switch (sort) {
    case 'recent': orderBy = { createdAt: 'desc' }; break;
    case 'price_low': orderBy = { salePrice: 'asc' }; break;
    case 'price_high': orderBy = { salePrice: 'desc' }; break;
    case 'rating': orderBy = { averageRating: 'desc' }; break;
    case 'review': orderBy = { reviewCount: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const offset = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { id: true, brandName: true, logoUrl: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : null,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      defaultCommissionRate: Number(p.defaultCommissionRate),
      shippingFee: Number(p.shippingFee),
      freeShippingThreshold: p.freeShippingThreshold ? Number(p.freeShippingThreshold) : null,
      averageRating: p.averageRating ? Number(p.averageRating) : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
