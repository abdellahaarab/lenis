import { describe, expect, it } from 'vitest';
import { PRODUCT_UPDATE_LIMIT, ProductSummarySchema } from '@aljeel/shared';
import { partitionUpdateProducts, parseUpdateWorkbook } from '../src/product-updates.js';
import { ConfigSchema } from '../src/config.js';

type Product = Parameters<typeof partitionUpdateProducts>[0][number];
const product = (id: string, options: number) => ({ id, variants: Array.from({ length: options }, (_, i) => ({ id: id + '-v' + i, productId: id })) }) as Product;
describe('numbered Excel parts', () => {
  it('keeps normal products together, stays within the combined row limit and includes every variant exactly once', () => {
    const products = Array.from({ length: 550 }, (_, i) => product('p' + i, i % 3 === 0 ? 3 : 1));
    const parts = partitionUpdateProducts(products);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(p => p.rows <= PRODUCT_UPDATE_LIMIT && p.rows === p.products.length + p.variants.length)).toBe(true);
    expect(parts.flatMap(p => p.products.map(p => p.id))).toEqual(products.map(p => p.id));
    expect(new Set(parts.flatMap(p => p.variants.map(v => v.id))).size).toBe(products.filter(p => p.variants.length > 1).reduce((n, p) => n + p.variants.length, 0));
  });
  it('splits a single product with more than 999 variants, without dropping or repeating options', () => {
    const p = product('large', 2200), parts = partitionUpdateProducts([p]);
    expect(parts).toHaveLength(3);
    expect(parts.every(part => part.products[0].id === p.id && part.rows <= PRODUCT_UPDATE_LIMIT)).toBe(true);
    expect(parts.flatMap(part => part.variants.map(v => v.id))).toEqual(p.variants.map(v => v.id));
  });
  it('supports empty catalogs and products without active options', () => {
    expect(partitionUpdateProducts([])[0].rows).toBe(0);
    expect(partitionUpdateProducts([product('no-options', 0)])[0].rows).toBe(1);
  });
});
it('rejects corrupt files before ZIP decoding or database access', async () => {
  const config = ConfigSchema.parse({ DATABASE_URL: 'mysql://test@localhost/test', SESSION_SECRET: 's'.repeat(32), TOTP_ENCRYPTION_KEY: 'a'.repeat(64), ALLOWED_ORIGINS: 'http://localhost:5174' });
  await expect(parseUpdateWorkbook(Buffer.alloc(100), config)).rejects.toThrow('update_invalid_file');
});
it('cleared descriptions remain valid in the public catalog and product editor', () => {
  expect(ProductSummarySchema.parse({ ar: '', en: '' })).toEqual({ ar: '', en: '' });
});
