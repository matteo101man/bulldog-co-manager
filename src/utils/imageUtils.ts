/**
 * Convert Instagram post URL to direct image URL
 * Uses Instagram's oEmbed API to get the thumbnail URL, which is a direct image URL
 * 
 * @param url - The URL to convert (can be Instagram post URL or regular image URL)
 * @returns Promise that resolves to the converted image URL or original URL if not an Instagram post
 */
export async function convertInstagramUrl(url: string): Promise<string> {
  if (!url) return url;
  
  // Check if it's an Instagram post URL (handles URLs with query parameters)
  const instagramPostPattern = /^https?:\/\/(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/;
  const match = url.match(instagramPostPattern);
  
  if (match) {
    try {
      // Use Instagram oEmbed API to get the image URL
      // This returns a thumbnail_url which is a direct CDN URL
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        // Return the thumbnail_url which is the direct image URL
        if (data.thumbnail_url) {
          return data.thumbnail_url;
        }
      }
    } catch (error) {
      // If oEmbed fails (e.g., CORS), try using a CORS proxy
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`)}`;
        const proxyResponse = await fetch(proxyUrl);
        
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          const data = JSON.parse(proxyData.contents);
          if (data.thumbnail_url) {
            return data.thumbnail_url;
          }
        }
      } catch (proxyError) {
        console.warn('Failed to fetch Instagram oEmbed via proxy, using fallback:', proxyError);
      }
    }
    
    // Fallback: try the /media/ endpoint (may not work for all posts)
    const postId = match[2];
    return `https://www.instagram.com/p/${postId}/media/?size=l`;
  }
  
  // If it's already a direct image URL or not an Instagram URL, return as-is
  return url;
}

/**
 * Check if a URL is an Instagram post URL
 */
export function isInstagramPostUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\/(www\.)?instagram\.com\/p\//.test(url);
}
