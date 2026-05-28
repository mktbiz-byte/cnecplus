import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BrandProfileClient } from './brand-profile-client';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';
import { buildHreflangAlternates } from '@/lib/seo';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

interface PageProps {
  params: Promise<{ locale: string; brandId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, brandId } = await params;
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { brandName: true, description: true, logoUrl: true },
  });
  if (!brand) return { title: 'Brand Not Found' };

  const desc = brand.description || `${brand.brandName} 브랜드 프로필`;
  const canonicalUrl = `${BASE_URL}/${locale}/brands/${brandId}`;

  return {
    title: `${brand.brandName} — CNEC`,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
      languages: buildHreflangAlternates(`/brands/${brandId}`),
    },
    openGraph: {
      title: `${brand.brandName} — CNEC`,
      description: desc,
      url: canonicalUrl,
      images: brand.logoUrl ? [{ url: brand.logoUrl, width: 400, height: 400 }] : [],
      type: 'website',
      siteName: 'CNEC Commerce',
    },
    twitter: {
      card: 'summary',
      title: `${brand.brandName} — CNEC`,
      description: desc,
      images: brand.logoUrl ? [brand.logoUrl] : [],
    },
    robots: { index: true, follow: true },
  };
}

async function getBrandProfile(brandId: string) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      brandName: true,
      companyName: true,
      logoUrl: true,
      description: true,
      descriptionEn: true,
      contactEmail: true,
      csPhone: true,
      csEmail: true,
      csHours: true,
      shippingReturnAddress: true,
      exchangePolicy: true,
      brandInstagramHandle: true,
      certifications: true,
      createdAt: true,
    },
  });

  if (!brand) return null;

  const products = await prisma.product.findMany({
    where: { brandId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      thumbnailUrl: true,
      salePrice: true,
      originalPrice: true,
      images: true,
      category: true,
      averageRating: true,
      reviewCount: true,
    },
    orderBy: { reviewCount: 'desc' },
    take: 20,
  });

  const stats = await prisma.product.aggregate({
    where: { brandId, status: 'ACTIVE' },
    _count: { id: true },
    _avg: { averageRating: true },
  });

  const totalReviews = await prisma.productReview.count({
    where: {
      product: { brandId },
      isApproved: true,
    },
  });

  return {
    brand,
    products: products.map((p) => ({
      ...p,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      averageRating: p.averageRating ? Number(p.averageRating) : null,
    })),
    stats: {
      productCount: stats._count.id,
      averageRating: stats._avg.averageRating ? Number(stats._avg.averageRating) : null,
      totalReviews,
    },
  };
}

export default async function BrandProfilePage({ params }: PageProps) {
  const { locale, brandId } = await params;
  const data = await getBrandProfile(brandId);

  if (!data) notFound();

  return (
    <>
      <OrganizationJsonLd
        name={data.brand.brandName || ''}
        url={`${BASE_URL}/${locale}/brands/${brandId}`}
        imageUrl={data.brand.logoUrl || undefined}
        description={data.brand.description || undefined}
      />
      <BrandProfileClient data={data} locale={locale} />
    </>
  );
}
