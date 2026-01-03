/**
 * Check if a URL is an Instagram post URL
 */
export function isInstagramPostUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\/(www\.)?instagram\.com\/p\//.test(url);
}
