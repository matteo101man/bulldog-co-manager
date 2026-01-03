/**
 * Convert Instagram post URL to direct image URL
 * Instagram post URLs can be converted to image URLs by appending /media/?size=l
 * 
 * @param url - The URL to convert (can be Instagram post URL or regular image URL)
 * @returns The converted image URL or original URL if not an Instagram post
 */
export function convertInstagramUrl(url: string): string {
  if (!url) return url;
  
  // Check if it's an Instagram post URL
  const instagramPostPattern = /^https?:\/\/(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)\/?/;
  const match = url.match(instagramPostPattern);
  
  if (match) {
    const postId = match[2];
    // Convert to large size image URL
    return `https://www.instagram.com/p/${postId}/media/?size=l`;
  }
  
  // If it's already an Instagram media URL or not an Instagram URL, return as-is
  return url;
}

/**
 * Check if a URL is an Instagram post URL
 */
export function isInstagramPostUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\/(www\.)?instagram\.com\/p\//.test(url);
}
