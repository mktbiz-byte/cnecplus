import { describe, it, expect } from 'vitest';
import { getInstagramEmbedUrl, getTikTokEmbedUrl, detectContentType } from './embed';

describe('getInstagramEmbedUrl', () => {
  it('유효한 인스타그램 URL → embed URL (trailing slash)', () => {
    const result = getInstagramEmbedUrl('https://www.instagram.com/p/ABC123/');
    expect(result).toBe('https://www.instagram.com/p/ABC123/embed/');
  });

  it('reel URL도 처리', () => {
    const result = getInstagramEmbedUrl('https://www.instagram.com/reel/XYZ789/');
    expect(result).toBe('https://www.instagram.com/reel/XYZ789/embed/');
  });

  it('잘못된 URL → null', () => {
    expect(getInstagramEmbedUrl('https://youtube.com/watch?v=123')).toBeNull();
    expect(getInstagramEmbedUrl('')).toBeNull();
  });
});

describe('getTikTokEmbedUrl', () => {
  it('유효한 틱톡 URL → embed URL', () => {
    const result = getTikTokEmbedUrl('https://www.tiktok.com/@user/video/1234567890');
    expect(result).toBe('https://www.tiktok.com/embed/v2/1234567890');
  });

  it('잘못된 URL → null', () => {
    expect(getTikTokEmbedUrl('https://instagram.com/p/123')).toBeNull();
  });
});

describe('detectContentType', () => {
  it('인스타그램 URL → INSTAGRAM_REEL', () => {
    expect(detectContentType('https://www.instagram.com/p/ABC/')).toBe('INSTAGRAM_REEL');
  });

  it('틱톡 URL → TIKTOK', () => {
    expect(detectContentType('https://www.tiktok.com/@user/video/123')).toBe('TIKTOK');
  });

  it('유튜브 쇼츠 URL → YOUTUBE_SHORT', () => {
    expect(detectContentType('https://www.youtube.com/shorts/123')).toBe('YOUTUBE_SHORT');
    expect(detectContentType('https://youtu.be/123')).toBe('YOUTUBE_SHORT');
  });

  it('기타 URL → INSTAGRAM_REEL (기본값)', () => {
    expect(detectContentType('https://example.com')).toBe('INSTAGRAM_REEL');
  });
});
