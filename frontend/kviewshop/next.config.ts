import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.daumcdn.net https://t1.kakaocdn.net https://postcode.map.kakao.com https://js.tosspayments.com https://*.tosspayments.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.portone.io https://api.tosspayments.com https://*.tosspayments.com https://kapi.kakao.com https://*.r2.dev https://*.cloudflarestorage.com https://storage.cnec.kr https://cnecshop.com https://*.cnecshop.com https://postcode.map.kakao.com https://*.daumcdn.net https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com",
      "frame-src 'self' https://js.tosspayments.com https://*.tosspayments.com https://accounts.kakao.com https://service.portone.io https://www.instagram.com https://www.tiktok.com https://t1.daumcdn.net https://postcode.map.kakao.com",
      "media-src 'self' https: data:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestorage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);