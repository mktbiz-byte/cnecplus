'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 구조화된 에러 로깅
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#fafafa',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              !
            </div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '8px',
              }}
            >
              문제가 발생했습니다
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#8e8e93',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              일시적인 오류가 발생했습니다. 다시 시도해주세요.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                padding: '12px 32px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
