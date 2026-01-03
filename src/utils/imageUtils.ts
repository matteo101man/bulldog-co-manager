/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(str: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

/**
 * Extract Instagram post URL from HTML blockquote code or return the URL if it's already a URL
 */
export function extractInstagramUrl(input: string): string {
  if (!input) return input;
  
  const trimmed = input.trim();
  
  // Check if it's already a direct Instagram URL
  if (/^https?:\/\/(www\.)?instagram\.com\/p\//.test(trimmed)) {
    // Clean up query parameters to get base URL
    try {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return trimmed;
    }
  }
  
  // Try to extract URL from HTML blockquote
  // Look for data-instgrm-permalink attribute
  const permalinkMatch = trimmed.match(/data-instgrm-permalink=["']([^"']+)["']/);
  if (permalinkMatch && permalinkMatch[1]) {
    let url = permalinkMatch[1];
    // Decode HTML entities (e.g., &amp; -> &)
    url = decodeHtmlEntities(url);
    // Clean up query parameters
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }
  
  // Try to extract from href attributes
  const hrefMatch = trimmed.match(/href=["'](https?:\/\/[^"']*instagram\.com\/p\/[^"']+)["']/);
  if (hrefMatch && hrefMatch[1]) {
    let url = hrefMatch[1];
    // Decode HTML entities
    url = decodeHtmlEntities(url);
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }
  
  return trimmed;
}

/**
 * Check if a URL or HTML contains an Instagram post URL
 */
export function isInstagramPostUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a direct URL
  if (/^https?:\/\/(www\.)?instagram\.com\/p\//.test(url.trim())) {
    return true;
  }
  
  // Check if it contains Instagram embed HTML
  return /data-instgrm-permalink=["']([^"']*instagram\.com\/p\/[^"']+)["']/.test(url) ||
         /href=["']([^"']*instagram\.com\/p\/[^"']+)["']/.test(url);
}
