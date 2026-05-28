import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Creator Shop';
  const bio = searchParams.get('bio') || '';
  const image = searchParams.get('image') || '';
  const followers = searchParams.get('followers') || '';
  const products = searchParams.get('products') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Profile Image */}
        {image && (
          <img
            src={image}
            width={140}
            height={140}
            style={{
              borderRadius: '70px',
              objectFit: 'cover',
              border: '4px solid rgba(167, 139, 250, 0.5)',
              marginBottom: '24px',
            }}
          />
        )}

        {/* Name */}
        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          {name}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize: '22px',
              color: '#94a3b8',
              maxWidth: '700px',
              textAlign: 'center',
              lineHeight: 1.4,
              marginBottom: '24px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {bio}
          </div>
        )}

        {/* Stats */}
        {(followers || products) && (
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginTop: '8px',
            }}
          >
            {followers && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#a78bfa' }}>
                  {followers}
                </div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>Followers</div>
              </div>
            )}
            {products && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#f472b6' }}>
                  {products}
                </div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>Products</div>
              </div>
            )}
          </div>
        )}

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
