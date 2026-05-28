import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cnecshop.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/*/admin/',
          '/*/brand/',
          '/*/creator/',
          '/*/buyer/',
          '/*/signup',
          '/*/login',
          '/*/checkout/',
          '/*/cart',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
