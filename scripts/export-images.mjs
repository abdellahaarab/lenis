import mariadb from 'mariadb';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const url = new URL(process.env.DATABASE_URL || 'mysql://u498439850_root:%23Ammarcom12@srv2051.hstgr.io:3306/u498439850_alar?ssl=true');
const outputDir = resolve(process.argv[2] || '.backups/imported_images_20261027');

await mkdir(outputDir, { recursive: true });
console.log(`[Export] Target directory: ${outputDir}`);

const pool = mariadb.createPool({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: true,
  connectionLimit: 3,
  connectTimeout: 30000,
  idleTimeout: 300,
});

try {
  const conn = await pool.getConnection();
  console.log('[Export] Connected to database successfully.');

  // 1. Get total images count with content
  const [{ total }] = await conn.query('SELECT COUNT(*) as total FROM MediaAsset WHERE content IS NOT NULL');
  console.log(`[Export] Total media images to export: ${total}`);

  // 2. Fetch metadata map (products, brands, categories)
  const productImages = await conn.query(`
    SELECT pi.mediaId, pi.productId, pi.sort, pi.shot, p.title, p.model
    FROM ProductImage pi
    JOIN Product p ON pi.productId = p.id
  `);

  const productMap = new Map();
  for (const row of productImages) {
    let title = row.title;
    try {
      if (typeof title === 'string' && title.startsWith('{')) {
        const parsed = JSON.parse(title);
        title = parsed.ar || parsed.en || row.title;
      }
    } catch {}
    productMap.set(row.mediaId, {
      productId: row.productId,
      productTitle: title,
      model: row.model,
      sort: row.sort,
      shot: row.shot
    });
  }

  // 3. Batch export images
  const batchSize = 100;
  let offset = 0;
  let exported = 0;
  const manifest = [];

  while (offset < Number(total)) {
    const rows = await conn.query(
      'SELECT id, kind, originalPath, mime, altAr, altEn, length(content) as byte_size, content, createdAt FROM MediaAsset WHERE content IS NOT NULL ORDER BY id LIMIT ? OFFSET ?',
      [batchSize, offset]
    );

    if (!rows.length) break;

    for (const row of rows) {
      const ext = row.mime === 'image/jpeg' ? '.jpg' :
                  row.mime === 'image/png' ? '.png' :
                  row.mime === 'image/svg+xml' ? '.svg' :
                  row.mime === 'image/gif' ? '.gif' : '.webp';

      const filename = `${row.id}${ext}`;
      const filePath = join(outputDir, filename);

      if (row.content) {
        await writeFile(filePath, Buffer.from(row.content));
        exported++;
      }

      const prodInfo = productMap.get(row.id) || null;
      manifest.push({
        id: row.id,
        filename,
        mime: row.mime,
        sizeBytes: Number(row.byte_size),
        originalPath: row.originalPath,
        altAr: row.altAr,
        altEn: row.altEn,
        product: prodInfo,
        createdAt: row.createdAt
      });
    }

    offset += rows.length;
    process.stdout.write(`\r[Export] Progress: ${exported}/${total} images exported (${Math.round((exported/Number(total))*100)}%)`);
  }

  console.log('\n[Export] Saving manifest.json...');
  await writeFile(
    join(outputDir, 'manifest.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), totalExported: exported, images: manifest }, null, 2),
    'utf8'
  );

  console.log(`[Export] Completed! ${exported} images and manifest saved to: ${outputDir}`);
  conn.release();
} catch (err) {
  console.error('[Export] Error:', err);
  process.exit(1);
} finally {
  await pool.end();
}
