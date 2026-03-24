const MAX_CHARS = 15_000;

/**
 * Tags to remove entirely (including content).
 */
const REMOVE_TAGS = [
  'script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg', 'iframe',
  'link', 'meta',
];

/**
 * Clean HTML for LLM consumption by removing non-content elements.
 * Returns cleaned text and extracted image URLs.
 */
export function cleanHtml(html: string): { text: string; imageUrls: string[] } {
  let cleaned = html;

  // Remove hidden elements (display:none, visibility:hidden, aria-hidden)
  cleaned = cleaned.replace(
    /<[^>]+(display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden\s*=\s*["']true["'])[^>]*>[\s\S]*?<\/[^>]+>/gi,
    ''
  );

  // Remove unwanted tags and their content
  for (const tag of REMOVE_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(regex, '');
    // Also remove self-closing variants
    const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    cleaned = cleaned.replace(selfClosing, '');
  }

  // Extract image URLs before stripping tags
  const imageUrls = extractImageUrls(cleaned);

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Strip remaining HTML tags but keep content
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = decodeEntities(cleaned);

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (cleaned.length > MAX_CHARS) {
    cleaned = cleaned.slice(0, MAX_CHARS);
  }

  return { text: cleaned, imageUrls };
}

/**
 * Extract image URLs from img tags in HTML.
 */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !url.startsWith('data:') && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Decode common HTML entities.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
