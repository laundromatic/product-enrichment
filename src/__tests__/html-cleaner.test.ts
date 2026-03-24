import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cleanHtml, extractImageUrls } from '../html-cleaner.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const noSchemaHtml = readFileSync(join(FIXTURES, 'no-schema-product.html'), 'utf-8');
const shopifyHtml = readFileSync(join(FIXTURES, 'shopify-product.html'), 'utf-8');

describe('cleanHtml', () => {
  it('removes script tags and content', () => {
    const { text } = cleanHtml('<div>Hello</div><script>alert("x")</script><div>World</div>');
    expect(text).not.toContain('alert');
    expect(text).toContain('Hello');
    expect(text).toContain('World');
  });

  it('removes style tags and content', () => {
    const { text } = cleanHtml('<style>.x { color: red; }</style><p>Content</p>');
    expect(text).not.toContain('color');
    expect(text).toContain('Content');
  });

  it('removes nav, footer, header tags', () => {
    const { text } = cleanHtml('<header>Header</header><main>Main Content</main><footer>Footer</footer>');
    expect(text).not.toContain('Header');
    expect(text).not.toContain('Footer');
    expect(text).toContain('Main Content');
  });

  it('removes noscript and svg tags', () => {
    const { text } = cleanHtml('<noscript>Enable JS</noscript><svg><path/></svg><p>Visible</p>');
    expect(text).not.toContain('Enable JS');
    expect(text).toContain('Visible');
  });

  it('removes HTML comments', () => {
    const { text } = cleanHtml('<!-- comment --><p>Content</p>');
    expect(text).not.toContain('comment');
    expect(text).toContain('Content');
  });

  it('decodes HTML entities', () => {
    const { text } = cleanHtml('<p>&amp; &lt; &gt; &quot; &#39; &nbsp;</p>');
    expect(text).toContain('&');
    expect(text).toContain('<');
    expect(text).toContain('>');
    expect(text).toContain('"');
    expect(text).toContain("'");
  });

  it('normalizes whitespace', () => {
    const { text } = cleanHtml('<p>  Hello   \n\n   World  </p>');
    expect(text).toBe('Hello World');
  });

  it('respects character limit', () => {
    const longContent = '<p>' + 'x'.repeat(20000) + '</p>';
    const { text } = cleanHtml(longContent);
    expect(text.length).toBeLessThanOrEqual(15000);
  });

  it('extracts image URLs during cleaning', () => {
    const { imageUrls } = cleanHtml('<img src="https://example.com/photo.jpg" alt="test"><p>Text</p>');
    expect(imageUrls).toContain('https://example.com/photo.jpg');
  });

  it('cleans real product page (no-schema fixture)', () => {
    const { text, imageUrls } = cleanHtml(noSchemaHtml);
    expect(text).toContain('Handmade Ceramic Vase');
    expect(text).toContain('$45.00');
    expect(text).toContain('Ocean Blue');
    expect(text).not.toContain('analytics.js');
    expect(text).not.toContain('dataLayer');
    expect(imageUrls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('extractImageUrls', () => {
  it('extracts src from img tags', () => {
    const html = '<img src="https://example.com/a.jpg"><img src="https://example.com/b.png">';
    const urls = extractImageUrls(html);
    expect(urls).toEqual(['https://example.com/a.jpg', 'https://example.com/b.png']);
  });

  it('skips data: URIs', () => {
    const html = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAA=="><img src="https://example.com/real.jpg">';
    const urls = extractImageUrls(html);
    expect(urls).toEqual(['https://example.com/real.jpg']);
  });

  it('deduplicates URLs', () => {
    const html = '<img src="https://example.com/a.jpg"><img src="https://example.com/a.jpg">';
    const urls = extractImageUrls(html);
    expect(urls).toEqual(['https://example.com/a.jpg']);
  });

  it('handles single and double quotes', () => {
    const html = `<img src='https://example.com/single.jpg'><img src="https://example.com/double.jpg">`;
    const urls = extractImageUrls(html);
    expect(urls).toHaveLength(2);
  });

  it('returns empty array for no images', () => {
    expect(extractImageUrls('<p>No images</p>')).toEqual([]);
  });
});
