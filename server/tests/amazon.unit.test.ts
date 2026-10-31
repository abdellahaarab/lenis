import { describe, it, expect } from 'vitest';
import { extractAsin, normalizeAmazonImageUrl, extractDirectImageUrls, parseAmazonHtml } from '../src/amazon-service.js';

describe('Amazon Service Unit Tests', () => {
  it('extracts ASIN from diverse URL formats and raw string', () => {
    expect(extractAsin('B07D99KFPK')).toBe('B07D99KFPK');
    expect(extractAsin('b07d99kfpk')).toBe('B07D99KFPK');
    expect(extractAsin('https://www.amazon.com/dp/B07D99KFPK')).toBe('B07D99KFPK');
    expect(extractAsin('https://www.amazon.ae/Seagate-BarraCuda-Internal-Drive-3-5-Inch/dp/B07D99KFPK/ref=sr_1_1')).toBe('B07D99KFPK');
    expect(extractAsin('https://www.amazon.sa/-/en/dp/B0088PUEPK?th=1')).toBe('B0088PUEPK');
    expect(extractAsin('https://www.amazon.co.uk/gp/product/B01N5IB20Q')).toBe('B01N5IB20Q');
    expect(extractAsin('https://www.google.com/url?sa=t&url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB07D99KFPK&usg=AOvVaw0')).toBe('B07D99KFPK');
    expect(extractAsin('https://www.google.com/url?q=https://www.amazon.com/dp/B07D99KFPK')).toBe('B07D99KFPK');
    expect(extractAsin('Check this out: https://www.amazon.com/dp/B07D99KFPK for more info')).toBe('B07D99KFPK');
    expect(extractAsin('not-an-asin')).toBeNull();
  });

  it('normalizes Amazon image URLs to high-res and thumbnails', () => {
    const original = 'https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL300_.jpg';
    const { highRes, thumb } = normalizeAmazonImageUrl(original);
    expect(highRes).toBe('https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg');
    expect(thumb).toBe('https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_US150_.jpg');
  });

  it('extracts direct image URLs from pasted text', () => {
    const text = `
      Check out these Amazon images:
      https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg
      and another:
      https://m.media-amazon.com/images/I/81OjMaK4TzL._AC_SY450_.jpg
    `;
    const images = extractDirectImageUrls(text);
    expect(images.length).toBe(2);
    expect(images[0].url).toContain('71Czt9ypIbL');
    expect(images[1].url).toContain('81OjMaK4TzL');
  });

  it('parses Amazon HTML with colorImages and title', () => {
    const fakeHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Seagate 1TB Hard Drive : Amazon.com</title></head>
        <body>
          <span id="productTitle"> Seagate BarraCuda 1TB Internal Hard Drive </span>
          <script>
            var obj = {
              'colorImages': {
                'initial': [
                  { "hiRes": "https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg", "thumb": "https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_US40_.jpg", "variant": "MAIN" },
                  { "large": "https://m.media-amazon.com/images/I/81OjMaK4TzL._AC_.jpg", "variant": "PT01" }
                ]
              }
            };
          </script>
        </body>
      </html>
    `;

    const { title, images } = parseAmazonHtml(fakeHtml);
    expect(title).toBe('Seagate BarraCuda 1TB Internal Hard Drive');
    expect(images.length).toBe(2);
    expect(images[0].url).toContain('71Czt9ypIbL');
    expect(images[1].url).toContain('81OjMaK4TzL');
  });

  it('filters out customer review photos and keeps only official product images', () => {
    const htmlWithReviews = `
      <!DOCTYPE html>
      <html>
        <body>
          <span id="productTitle">Lenovo 300W Adapter</span>
          <script>
            var obj = {
              'colorImages': {
                'initial': [
                  { "hiRes": "https://m.media-amazon.com/images/I/71Official111._AC_SL1500_.jpg", "thumb": "...", "variant": "MAIN" },
                  { "large": "https://m.media-amazon.com/images/I/81Official222._AC_.jpg", "variant": "PT01" }
                ]
              }
            };
          </script>
          <!-- Customer Reviews Section containing customer-uploaded photos -->
          <div id="customer-reviews">
            <h3>Customer Reviews</h3>
            <img class="review-image" src="https://m.media-amazon.com/images/S/review-photo-customer-12345.jpg" />
            <img class="review-image" src="https://m.media-amazon.com/images/I/91CustomerPhoto._AC_SL1500_.jpg" />
          </div>
        </body>
      </html>
    `;

    const { images } = parseAmazonHtml(htmlWithReviews);
    expect(images.length).toBe(2);
    expect(images.map(i => i.url)).toEqual([
      'https://m.media-amazon.com/images/I/71Official111._AC_SL1500_.jpg',
      'https://m.media-amazon.com/images/I/81Official222._AC_SL1500_.jpg',
    ]);
    // Ensure no customer review images were captured
    expect(images.some(i => i.url.includes('CustomerPhoto') || i.url.includes('/S/'))).toBe(false);
  });
});
