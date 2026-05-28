import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || '상품';
  const brand = searchParams.get('brand') || '';
  const price = searchParams.get('price') || '';
  const discount = searchParams.get('discount') || '';
  const image = searchParams.get('image') || '';
  const shop = searchParams.get('shop') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          position: 'relative',
        }}
      >
        {/* Product Image */}
        {image && (
          <div
            style={{
              width: '480px',
              height: '630px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            <img
              src={image}
              width={400}
              height={400}
              style={{
                borderRadius: '20px',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Text Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 50px 40px 20px',
            color: 'white',
          }}
        >
          {brand && (
            <div
              style={{
                fontSize: '22px',
                color: '#a78bfa',
                marginBottom: '12px',
                fontWeight: 500,
              }}
            >
              {brand}
            </div>
          )}

          <div
            style={{
              fontSize: name.length > 30 ? '32px' : '40px',
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: '24px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              overflow: 'hidden',
            }}
          >
            {name}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            {discount && (
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#f472b6',
                }}
              >
                {discount}%
              </div>
            )}
            {price && (
              <div
                style={{
                  fontSize: '34px',
                  fontWeight: 700,
                }}
              >
                {price}
              </div>
            )}
          </div>

          {shop && (
            <div
              style={{
                marginTop: '32px',
                fontSize: '20px',
                color: '#94a3b8',
              }}
            >
              {shop}
            </div>
          )}
        </div>

        {/* CNEC Logo */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '32px',
            fontSize: '18px',
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          CNEC Commerce
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
