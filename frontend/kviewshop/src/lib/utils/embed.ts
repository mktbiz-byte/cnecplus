export function getInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(reel|p)\/([^/?]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

export function getTikTokEmbedUrl(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (!match) return null;
  return `https://www.tiktok.com/embed/v2/${match[1]}`;
}

export function getEmbedUrl(url: string, type: string): string | null {
  if (type === 'INSTAGRAM_REEL' || url.includes('instagram.com')) {
    return getInstagramEmbedUrl(url);
  }
  if (type === 'TIKTOK' || url.includes('tiktok.com')) {
    return getTikTokEmbedUrl(url);
  }
  return null;
}

export function detectContentType(url: string): string {
  if (url.includes('instagram.com')) return 'INSTAGRAM_REEL';
  if (url.includes('tiktok.com')) return 'TIKTOK';
  if (url.includes('youtube.com/shorts') || url.includes('youtu.be')) return 'YOUTUBE_SHORT';
  if (url.includes('youtube.com')) return 'YOUTUBE_SHORT';
  return 'UNKNOWN';
}
