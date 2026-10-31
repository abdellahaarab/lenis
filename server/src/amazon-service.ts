import type { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { AppConfig } from './config.js';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { ApiError } from './errors.js';
import { productDto, productInclude } from './catalog-service.js';

export interface AmazonImageItem {
  url: string;
  thumb: string;
  variant?: string;
  width?: number;
  height?: number;
}

export interface AmazonFetchResult {
  title: string;
  asin?: string;
  sourceUrl?: string;
  images: AmazonImageItem[];
  captchaChallenge?: boolean;
  message?: string;
}

/**
 * Extracts a 10-character Amazon ASIN from a URL or raw ASIN string.
 */
export function extractAsin(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  let trimmed = input.trim();
  
  // Handle percent-encoded URLs (e.g. copied from Google redirect or browser bar)
  try {
    if (trimmed.includes('%')) {
      trimmed = decodeURIComponent(trimmed);
    }
  } catch {}

  // Handle Google search redirect URLs (e.g. google.com/url?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2F... or ?q=...)
  if (trimmed.includes('google.') && (trimmed.includes('url=') || trimmed.includes('q='))) {
    const qMatch = trimmed.match(/[?&](?:url|q)=([^&]+)/i);
    if (qMatch && qMatch[1]) {
      try {
        let decodedTarget = qMatch[1];
        if (decodedTarget.includes('%')) {
          decodedTarget = decodeURIComponent(decodedTarget);
        }
        const innerAsin = extractAsin(decodedTarget);
        if (innerAsin) return innerAsin;
      } catch {}
    }
  }

  // Extract direct Amazon URL if embedded in text
  const embeddedAmzMatch = trimmed.match(/https?:\/\/(?:[a-z0-9-]+\.)?amazon\.[a-z.]+[^\s"'<>]+/i);
  if (embeddedAmzMatch) {
    trimmed = embeddedAmzMatch[0];
  }

  // Direct ASIN string (10 alphanumeric chars)
  if (/^[A-Za-z0-9]{10}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  // URL patterns: /dp/B0..., /gp/product/B0..., /ASIN/B0..., /d/B0..., /product-reviews/B0...
  const patterns = [
    /\/(?:dp|gp\/product|ASIN|product-reviews|d)\/([A-Za-z0-9]{10})/i,
    /(?:amazon\.[a-z.]+\/.*[?&]asin=)([A-Za-z0-9]{10})/i,
    /\/([A-Za-z0-9]{10})(?:[/?#&]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && /^[A-Za-z0-9]{10}$/.test(match[1])) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

/**
 * Normalizes an Amazon CDN image URL to a high-resolution version.
 */
export function normalizeAmazonImageUrl(url: string): { highRes: string; thumb: string } {
  const clean = url.trim();
  
  // If it is from media-amazon.com/images/I/
  if (clean.includes('media-amazon.com/images/I/')) {
    // High-res version with 1500px maximum bounds
    const highRes = clean.replace(/\._[A-Za-z0-9_-]+_\./, '._AC_SL1500_.');
    // Thumbnail version
    const thumb = clean.replace(/\._[A-Za-z0-9_-]+_\./, '._AC_US150_.');
    return { highRes, thumb };
  }

  return { highRes: clean, thumb: clean };
}

/**
 * Parses image URLs directly provided as text (e.g. pasted links, comma or newline separated).
 */
export function extractDirectImageUrls(text: string): AmazonImageItem[] {
  if (!text || typeof text !== 'string') return [];
  const items: AmazonImageItem[] = [];
  const seen = new Set<string>();

  // Regex to find image URLs
  const urlRegex = /(https?:\/\/[^\s"',<>[\]{}|\\^`]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"',<>[\]{}|\\^`]*)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const rawUrl = match[1];
    const { highRes, thumb } = normalizeAmazonImageUrl(rawUrl);
    
    // Extract base image ID to prevent duplicates of different sizes
    const idMatch = highRes.match(/media-amazon\.com\/images\/I\/([A-Za-z0-9+_-]+)/);
    const key = idMatch ? idMatch[1] : highRes;

    if (!seen.has(key)) {
      seen.add(key);
      items.push({ url: highRes, thumb });
    }
  }

  return items;
}

/**
 * Parses Amazon product page HTML to extract title and all **official product gallery** images.
 * Deliberately skips customer review images, which appear in a different part of the HTML.
 */
export function parseAmazonHtml(html: string): { title: string; images: AmazonImageItem[] } {
  let title = '';
  const titleMatch = html.match(/<span id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)
    || html.match(/<title>([\s\S]*?)<\/title>/i);
  
  if (titleMatch) {
    title = titleMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    // Clean up Amazon title suffixes like ": Amazon.com: Books"
    title = title.replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, '').trim();
  }

  const images: AmazonImageItem[] = [];
  const seen = new Set<string>();

  /**
   * Returns true if this image URL/ID looks like a customer review photo rather than
   * an official product gallery image.
   *
   * Amazon CDN paths for review images usually contain:
   *  - "/S/" segment in the path (e.g. /images/S/ or media-amazon.com/images/S/)
   *  - long IDs that are 32+ chars (UUID-like) — customer uploads
   *  - known review-section image IDs
   */
  function isReviewOrBadgeImage(url: string): boolean {
    if (!url) return false;
    // Images under /images/S/ are customer-uploaded review images
    if (/\/images\/S\//i.test(url)) return true;
    // Amazon badge/UI images (very short IDs like "01" or known icon names)
    if (/\/images\/I\/(transparent|play-button|checkmark|star|arrow|icon|badge|01\b)/i.test(url)) return true;
    // review-image-gallery, customer-reviews section links
    if (/customer.?review|review.?image/i.test(url)) return true;
    // UUIDs in path (customer uploads): 8-4-4-4-12 hex format
    if (/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(url)) return true;
    return false;
  }

  function registerImage(rawUrl: string, rawThumb?: string, variant?: string) {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    if (isReviewOrBadgeImage(rawUrl)) return;
    const { highRes, thumb } = normalizeAmazonImageUrl(rawUrl);
    if (isReviewOrBadgeImage(highRes)) return;
    const idMatch = highRes.match(/media-amazon\.com\/images\/I\/([A-Za-z0-9+_-]+)/);
    const key = idMatch ? idMatch[1] : highRes;

    if (!seen.has(key)) {
      seen.add(key);
      images.push({
        url: highRes,
        thumb: rawThumb ? normalizeAmazonImageUrl(rawThumb).thumb : thumb,
        variant
      });
    }
  }

  // -----------------------------------------------------------------------
  // Strategy 1 (highest priority): colorImages JSON – Amazon's official
  //   product gallery payload, NEVER contains customer review images.
  // -----------------------------------------------------------------------
  let foundViaColorImages = false;

  // Pattern A – classic var data = A.$.parseJSON('...')  (older pages)
  const colorMatchA = html.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*A\.\$\.parseJSON\('([^']+)'\)/);
  if (colorMatchA) {
    try {
      const rawJson = colorMatchA[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const imgUrl = item.hiRes || item.large || (item.main && Object.keys(item.main)[0]);
          if (imgUrl) registerImage(imgUrl, item.thumb, item.variant);
        }
        foundViaColorImages = images.length > 0;
      }
    } catch { /* fall through */ }
  }

  // Pattern B – inline array literal  'colorImages': { 'initial': [...]
  if (!foundViaColorImages) {
    const colorMatchB = html.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (colorMatchB) {
      try {
        const parsed = JSON.parse(colorMatchB[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            const imgUrl = item.hiRes || item.large || (item.main && Object.keys(item.main)[0]);
            if (imgUrl) registerImage(imgUrl, item.thumb, item.variant);
          }
          foundViaColorImages = images.length > 0;
        }
      } catch { /* fall through */ }
    }
  }

  // Pattern C – newer pages use "colorImages":{"initial":[...]} (double quotes)
  if (!foundViaColorImages) {
    const colorMatchC = html.match(/"colorImages"\s*:\s*\{\s*"initial"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (colorMatchC) {
      try {
        const parsed = JSON.parse(colorMatchC[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            const imgUrl = item.hiRes || item.large || (item.main && Object.keys(item.main)[0]);
            if (imgUrl) registerImage(imgUrl, item.thumb, item.variant);
          }
          foundViaColorImages = images.length > 0;
        }
      } catch { /* fall through */ }
    }
  }

  // -----------------------------------------------------------------------
  // Strategy 2: imageGalleryData – another official gallery payload
  // -----------------------------------------------------------------------
  if (!foundViaColorImages) {
    const galleryMatch = html.match(/'imageGalleryData'\s*:\s*(\[[\s\S]*?\])\s*[,;}]/)
      || html.match(/"imageGalleryData"\s*:\s*(\[[\s\S]*?\])\s*[,;}]/);
    if (galleryMatch) {
      try {
        const parsed = JSON.parse(galleryMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            const imgUrl = item.mainUrl || item.thumbUrl;
            if (imgUrl) registerImage(imgUrl, item.thumbUrl);
          }
        }
      } catch { /* fall through */ }
    }
  }

  // -----------------------------------------------------------------------
  // Strategy 3 (fallback only if above failed): data-a-dynamic-image on the
  //   main product image block – official gallery only, never review images.
  // -----------------------------------------------------------------------
  if (images.length === 0) {
    // Only look within the main product image container, not the review section.
    // We limit the search scope to the first 25,000 chars to stay away from reviews.
    const topSection = html.slice(0, Math.min(html.length, 60000));
    const dynMatch = topSection.match(/data-a-dynamic-image=["'](\{.+?\})["']/);
    if (dynMatch) {
      try {
        const decoded = dynMatch[1].replace(/&quot;/g, '"');
        const parsed = JSON.parse(decoded);
        for (const url of Object.keys(parsed)) {
          registerImage(url);
        }
      } catch { /* ignore */ }
    }
  }

  // -----------------------------------------------------------------------
  // Strategy 4 (last resort): targeted regex on the product image section ONLY.
  //   We deliberately exclude the customer-review section by limiting to the
  //   portion of HTML BEFORE any review-section markers.
  // -----------------------------------------------------------------------
  if (images.length === 0) {
    // Find the point where customer reviews begin (and stop before it)
    const reviewSectionStart = Math.min(
      html.indexOf('customer-reviews') > -1 ? html.indexOf('customer-reviews') : html.length,
      html.indexOf('customerReviews') > -1 ? html.indexOf('customerReviews') : html.length,
      html.indexOf('review-image') > -1 ? html.indexOf('review-image') : html.length,
      // Also stop before the review tile list section
      html.indexOf('review_body') > -1 ? html.indexOf('review_body') : html.length,
    );
    const galleryOnlyHtml = html.slice(0, reviewSectionStart);

    // Only extract images from known product gallery image containers.
    // Image IDs for official product images are typically 11 characters long.
    const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/([A-Za-z0-9+_-]{10,16})(?:\._[A-Za-z0-9_-]+_)?\.(?:jpg|jpeg|png|webp)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(galleryOnlyHtml)) !== null) {
      const id = match[1];
      // Skip short IDs (icons/badges) and known bad patterns
      if (id.length < 10) continue;
      const url = `https://m.media-amazon.com/images/I/${id}._AC_SL1500_.jpg`;
      registerImage(url);
    }
  }

  return { title, images };
}

/**
 * Fetches an Amazon page with modern browser headers.
 */
async function fetchWithBrowserHeaders(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Amazon responded with HTTP ${res.status}`);
  }

  return res.text();
}

/**
 * Discovers and extracts images from Amazon URL, ASIN, HTML, or direct image links.
 */
export async function fetchAmazonImages(input: string): Promise<AmazonFetchResult> {
  if (!input || typeof input !== 'string') {
    throw new ApiError(400, 'invalid_input');
  }

  const trimmed = input.trim();

  // If input contains HTML tags (user pasted HTML directly)
  if (trimmed.includes('<html') || trimmed.includes('<body') || trimmed.includes('productTitle') || trimmed.includes('colorImages')) {
    const { title, images } = parseAmazonHtml(trimmed);
    return {
      title: title || 'Amazon Product',
      images,
      message: `تم استخراج ${images.length} صورة من كود الصفحة`
    };
  }

  // Check if input is a set of direct image URLs
  if (trimmed.includes('media-amazon.com/images/') && !trimmed.includes('/dp/') && !trimmed.includes('/gp/')) {
    const directImages = extractDirectImageUrls(trimmed);
    if (directImages.length > 0) {
      return {
        title: 'روابط صور أمازون مباشرة',
        images: directImages,
        message: `تم العثور على ${directImages.length} صورة مباشرة من أمازون`
      };
    }
  }

  // Extract ASIN or target URL
  const asin = extractAsin(trimmed);
  let targetUrl = trimmed;

  if (asin) {
    // If the input was an ASIN or URL, construct a standard Amazon URL
    if (!trimmed.startsWith('http')) {
      targetUrl = `https://www.amazon.com/dp/${asin}`;
    }
  } else if (!trimmed.startsWith('http')) {
    // Check if user entered direct image links
    const directImages = extractDirectImageUrls(trimmed);
    if (directImages.length > 0) {
      return {
        title: 'روابط صور مباشرة',
        images: directImages,
      };
    }
    throw new ApiError(400, 'invalid_amazon_url_or_asin');
  }

  try {
    let html = await fetchWithBrowserHeaders(targetUrl);
    let isCaptcha = html.includes('validateCaptcha') || html.includes('api-services-support@amazon.com');

    // If challenged and we have an ASIN, attempt fallback regional domains (amazon.ae / amazon.sa)
    if (isCaptcha && asin) {
      const fallbackDomains = ['amazon.ae', 'amazon.sa', 'amazon.co.uk'];
      for (const domain of fallbackDomains) {
        try {
          const fallbackUrl = `https://www.${domain}/dp/${asin}`;
          const fallbackHtml = await fetchWithBrowserHeaders(fallbackUrl);
          if (!fallbackHtml.includes('validateCaptcha')) {
            html = fallbackHtml;
            targetUrl = fallbackUrl;
            isCaptcha = false;
            break;
          }
        } catch {
          // Continue to next fallback domain
        }
      }
    }

    if (isCaptcha) {
      return {
        title: '',
        asin: asin ?? undefined,
        sourceUrl: targetUrl,
        images: [],
        captchaChallenge: true,
        message: 'طلبت أمازون التحقق الأمني. يمكنك نسخ ولصق روابط الصور مباشرة من صفحة المنتج.'
      };
    }

    const { title, images } = parseAmazonHtml(html);

    return {
      title,
      asin: asin ?? undefined,
      sourceUrl: targetUrl,
      images,
      message: images.length ? `تم العثور على ${images.length} صورة عالية الدقة` : 'لم يتم العثور على صور في الصفحة'
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // If fetching failed, check if any direct image links can be salvaged from input
    const directImages = extractDirectImageUrls(trimmed);
    if (directImages.length > 0) {
      return {
        title: 'روابط صور مباشرة',
        images: directImages,
      };
    }

    throw new ApiError(502, `فشل الاتصال بصفحة أمازون: ${errorMsg}`);
  }
}

/**
 * Downloads Amazon images, converts them into high-quality WebP MediaAssets,
 * and attaches them to the specified product.
 */
export async function importAmazonImagesToStore(
  db: PrismaClient,
  config: AppConfig,
  request: FastifyRequest,
  params: {
    imageUrls: string[];
    productId?: string;
    altAr?: string;
    altEn?: string;
    replaceExisting?: boolean;
    setAsPrimary?: boolean;
  }
) {
  if (!params.imageUrls || !Array.isArray(params.imageUrls) || params.imageUrls.length === 0) {
    throw new ApiError(400, 'no_images_selected');
  }

  // Limit to reasonable batch size
  const urlsToImport = params.imageUrls.slice(0, 100);

  return transaction(db, async tx => {
    let targetProduct = null;
    if (params.productId) {
      targetProduct = await tx.product.findUnique({
        where: { id: params.productId },
        include: productInclude
      });
      if (!targetProduct) {
        throw new ApiError(404, 'product_not_found');
      }
    }

    const importedAssets: {
      id: string;
      path: string;
      width: number;
      height: number;
      bytes: number;
    }[] = [];

    // Download and convert each image
    for (const rawUrl of urlsToImport) {
      const { highRes } = normalizeAmazonImageUrl(rawUrl);

      let buffer: Buffer;
      try {
        const response = await fetch(highRes, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
          }
        });
        if (!response.ok) {
          continue; // Skip failed image downloads gracefully
        }
        buffer = Buffer.from(await response.arrayBuffer());
      } catch {
        continue;
      }

      // Convert and optimize with Sharp
      try {
        const sharpInstance = sharp(buffer, {
          limitInputPixels: 24000000,
          failOn: 'none',
          animated: false
        });

        const webpBuffer = await sharpInstance
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85 })
          .toBuffer();

        const meta = await sharp(webpBuffer).metadata();
        const assetId = randomUUID();
        const originalPath = `/api/media/${assetId}`;

        const altAr = params.altAr || (targetProduct ? (targetProduct.title as any)?.ar || targetProduct.model : 'صورة منتج من أمازون');
        const altEn = params.altEn || (targetProduct ? (targetProduct.title as any)?.en || targetProduct.model : 'Amazon product image');

        await tx.mediaAsset.create({
          data: {
            id: assetId,
            kind: 'image',
            originalPath,
            variants: {},
            content: new Uint8Array(webpBuffer),
            mime: 'image/webp',
            bytes: BigInt(webpBuffer.length),
            width: meta.width ?? 1200,
            height: meta.height ?? 1200,
            altAr: String(altAr).slice(0, 190),
            altEn: String(altEn).slice(0, 190),
            sourceNote: `Imported from Amazon (${highRes.slice(0, 200)})`,
            licensed: false,
            createdBy: request.auth?.user?.id ?? null
          }
        });

        importedAssets.push({
          id: assetId,
          path: originalPath,
          width: meta.width ?? 1200,
          height: meta.height ?? 1200,
          bytes: webpBuffer.length
        });
      } catch (sharpError) {
        request.log.error(sharpError, 'Failed to process Amazon image with sharp');
      }
    }

    if (importedAssets.length === 0) {
      throw new ApiError(502, 'failed_to_download_amazon_images');
    }

    // Attach to product if productId was provided
    if (params.productId && targetProduct) {
      if (params.replaceExisting) {
        await tx.productImage.deleteMany({
          where: { productId: params.productId }
        });
      }

      // Determine existing sorts
      const existingImages = await tx.productImage.findMany({
        where: { productId: params.productId },
        orderBy: { sort: 'asc' }
      });

      if (params.setAsPrimary && existingImages.length > 0 && !params.replaceExisting) {
        // Shift existing images by the number of new images
        const shift = importedAssets.length;
        for (let i = existingImages.length - 1; i >= 0; i--) {
          await tx.productImage.update({
            where: { id: existingImages[i].id },
            data: { sort: existingImages[i].sort + shift }
          });
        }

        // Insert new images starting at 0
        for (let i = 0; i < importedAssets.length; i++) {
          await tx.productImage.create({
            data: {
              id: randomUUID(),
              productId: params.productId,
              mediaId: importedAssets[i].id,
              sort: i,
              shot: 'front_closed',
              altAr: (targetProduct.title as any)?.ar ?? targetProduct.model ?? '',
              altEn: (targetProduct.title as any)?.en ?? targetProduct.model ?? '',
            }
          });
        }
      } else {
        // Append at the end
        const baseSort = existingImages.length > 0
          ? Math.max(...existingImages.map(img => img.sort)) + 1
          : 0;

        for (let i = 0; i < importedAssets.length; i++) {
          await tx.productImage.create({
            data: {
              id: randomUUID(),
              productId: params.productId,
              mediaId: importedAssets[i].id,
              sort: baseSort + i,
              shot: 'front_closed',
              altAr: (targetProduct.title as any)?.ar ?? targetProduct.model ?? '',
              altEn: (targetProduct.title as any)?.en ?? targetProduct.model ?? '',
            }
          });
        }
      }

      // Log audit entry
      await audit(tx, config, request, {
        action: 'product.amazon_images_imported',
        entity: 'Product',
        entityId: params.productId,
        after: { count: importedAssets.length, paths: importedAssets.map(a => a.path) }
      });

      const updatedProduct = await tx.product.findUniqueOrThrow({
        where: { id: params.productId },
        include: productInclude
      });

      return {
        ok: true,
        count: importedAssets.length,
        imported: importedAssets,
        product: productDto(updatedProduct, true)
      };
    }

    // If no product was specified, images are saved into Media Library
    return {
      ok: true,
      count: importedAssets.length,
      imported: importedAssets
    };
  });
}
