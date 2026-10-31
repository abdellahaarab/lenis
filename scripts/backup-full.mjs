import mariadb from 'mariadb';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, stat, rename, unlink, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const dbUrl = process.env.DATABASE_URL || 'mysql://u498439850_root:%23Ammarcom12@srv2051.hstgr.io:3306/u498439850_alar?ssl=true';
const url = new URL(dbUrl);
const dbName = decodeURIComponent(url.pathname.slice(1));

// Output directory
const now = new Date();
const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const baseBackupDir = resolve(`../backups/backup_${dateStr}`);
const imagesDir = join(baseBackupDir, 'images');
const finalSqlPath = join(baseBackupDir, `database_${dbName}.sql`);
const tempSqlPath = join(baseBackupDir, `database_${dbName}.sql.tmp`);

await mkdir(baseBackupDir, { recursive: true });
await mkdir(imagesDir, { recursive: true });

console.log('====================================================');
console.log('🚀 Starting Full Backup: Database + Imported Images');
console.log(`📁 Target Directory: ${baseBackupDir}`);
console.log(`🗄️ Final SQL Path: ${finalSqlPath}`);
console.log(`🖼️ Images Directory: ${imagesDir}`);
console.log('====================================================');

const pool = mariadb.createPool({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: dbName,
  ssl: true,
  connectionLimit: 2,
  connectTimeout: 45000,
  acquireTimeout: 60000,
  idleTimeout: 3600,
});

let activeConn = null;

async function getActiveConnection() {
  if (activeConn) {
    try {
      await activeConn.ping();
      return activeConn;
    } catch {
      try { await activeConn.end(); } catch {}
      activeConn = null;
    }
  }

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      activeConn = await pool.getConnection();
      await activeConn.query('SET SESSION max_statement_time = 0');
      return activeConn;
    } catch (err) {
      console.warn(`[Connection Retry ${attempt}/10] Failed to get connection: ${err.message}. Retrying in 4s...`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  throw new Error('Could not establish database connection after 10 retries.');
}

async function queryWithRetry(sql, params = []) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await getActiveConnection();
      return await conn.query(sql, params);
    } catch (err) {
      console.warn(`[Query Retry ${attempt}/10] Error: ${err.message}. Reconnecting...`);
      if (activeConn) {
        try { await activeConn.end(); } catch {}
        activeConn = null;
      }
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  throw new Error(`Query failed after 10 retries: ${sql.slice(0, 100)}`);
}

function formatValue(conn, val) {
  if (val === null || val === undefined) return 'NULL';
  if (Buffer.isBuffer(val)) {
    return '0x' + val.toString('hex');
  }
  if (val instanceof Date) {
    const iso = val.toISOString();
    return `'${iso.slice(0, 10)} ${iso.slice(11, 23)}'`;
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'bigint') {
    return val.toString();
  }
  if (typeof val === 'object') {
    return conn.escape(JSON.stringify(val));
  }
  return conn.escape(val);
}

async function writeChunk(stream, data) {
  if (!stream.write(data)) {
    await new Promise(resolve => stream.once('drain', resolve));
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

try {
  const initialConn = await getActiveConnection();
  console.log('✅ Connected to Hostinger MySQL database.');

  // Pre-load product mapping for manifest
  console.log('📦 Fetching product & media relationships...');
  const productImages = await queryWithRetry(`
    SELECT pi.mediaId, pi.productId, pi.sort, pi.shot, p.title, p.model, p.category
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
      category: row.category,
      sort: row.sort,
      shot: row.shot
    });
  }

  // Get all BASE tables
  const tableRows = await queryWithRetry("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tables = tableRows.map(r => Object.values(r)[0]);
  console.log(`📋 Found ${tables.length} tables to backup.`);

  const sqlStream = createWriteStream(tempSqlPath, { flags: 'w', encoding: 'utf8' });

  // SQL Header
  await writeChunk(sqlStream, `-- ==============================================================
-- Full Database Backup (Al-Jeel Al-Arabi)
-- Host: ${url.hostname}    Database: ${dbName}
-- Date: ${now.toISOString()}
-- ==============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n`);

  const manifest = [];
  const tableStats = [];
  let totalImagesExported = 0;
  let totalImagesBytes = 0;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const prefix = `[${i + 1}/${tables.length}] Table: ${table}`;

    // Get CREATE TABLE
    const createRes = await queryWithRetry(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRes[0]['Create Table'];

    await writeChunk(sqlStream, `--
-- Table structure for \`${table}\`
--
DROP TABLE IF EXISTS \`${table}\`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
${createSql};
/*!40101 SET character_set_client = @saved_cs_client */;\n\n`);

    // Count rows
    const [{ total }] = await queryWithRetry(`SELECT COUNT(*) as total FROM \`${table}\``);
    const rowCount = Number(total);
    tableStats.push({ table, rows: rowCount });

    if (rowCount === 0) {
      console.log(`${prefix} (0 rows) - structure saved.`);
      continue;
    }

    await writeChunk(sqlStream, `--
-- Dumping data for \`${table}\`
--
LOCK TABLES \`${table}\` WRITE;
/*!40000 ALTER TABLE \`${table}\` DISABLE KEYS */;\n`);

    if (table === 'MediaAsset') {
      console.log(`${prefix} (${rowCount} rows) - streaming blobs and saving image files...`);
      const batchSize = 60;
      let offset = 0;

      while (offset < rowCount) {
        const rows = await queryWithRetry(
          `SELECT * FROM \`MediaAsset\` ORDER BY id LIMIT ? OFFSET ?`,
          [batchSize, offset]
        );

        if (!rows.length) break;

        const currentConn = await getActiveConnection();
        const rowStrings = [];
        for (const r of rows) {
          const colValues = Object.values(r).map(v => formatValue(currentConn, v));
          rowStrings.push(`(${colValues.join(',')})`);

          // Save physical image file if content exists
          if (r.content && Buffer.isBuffer(r.content)) {
            const ext = r.mime === 'image/jpeg' ? '.jpg' :
                        r.mime === 'image/png' ? '.png' :
                        r.mime === 'image/svg+xml' ? '.svg' :
                        r.mime === 'image/gif' ? '.gif' : '.webp';
            const filename = `${r.id}${ext}`;
            const filePath = join(imagesDir, filename);

            await writeFile(filePath, r.content);
            totalImagesExported++;
            totalImagesBytes += r.content.length;

            manifest.push({
              id: r.id,
              filename,
              mime: r.mime,
              bytes: r.content.length,
              width: r.width,
              height: r.height,
              originalPath: r.originalPath,
              altAr: r.altAr,
              altEn: r.altEn,
              product: productMap.get(r.id) || null,
              createdAt: r.createdAt
            });
          }
        }

        const insertSql = `INSERT INTO \`MediaAsset\` VALUES \n${rowStrings.join(',\n')};\n`;
        await writeChunk(sqlStream, insertSql);

        offset += rows.length;
        const pct = Math.round((offset / rowCount) * 100);
        process.stdout.write(`\r   -> Progress: ${offset}/${rowCount} rows (${pct}%)`);
      }
      console.log(`\n   ✅ Completed MediaAsset dump and image extraction.`);
    } else {
      // General tables
      const batchSize = 500;
      let offset = 0;

      while (offset < rowCount) {
        const rows = await queryWithRetry(
          `SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`,
          [batchSize, offset]
        );

        if (!rows.length) break;

        const currentConn = await getActiveConnection();
        const rowStrings = rows.map(r => {
          const colValues = Object.values(r).map(v => formatValue(currentConn, v));
          return `(${colValues.join(',')})`;
        });

        const insertSql = `INSERT INTO \`${table}\` VALUES \n${rowStrings.join(',\n')};\n`;
        await writeChunk(sqlStream, insertSql);

        offset += rows.length;
      }
      console.log(`${prefix} (${rowCount} rows) - done.`);
    }

    await writeChunk(sqlStream, `/*!40000 ALTER TABLE \`${table}\` ENABLE KEYS */;\nUNLOCK TABLES;\n\n`);
  }

  // Triggers
  console.log('⚡ Exporting triggers...');
  const triggers = await queryWithRetry('SHOW TRIGGERS');
  for (const t of triggers) {
    const triggerName = t.Trigger;
    const triggerRes = await queryWithRetry(`SHOW CREATE TRIGGER \`${triggerName}\``);
    let triggerStmt = triggerRes[0]['SQL Original Statement'];
    triggerStmt = triggerStmt.replace(/\/\*!50017 DEFINER=[^\r\n]*?\*\//g, '');

    await writeChunk(sqlStream, `--
-- Trigger \`${triggerName}\`
--
/*!50003 DROP TRIGGER IF EXISTS \`${triggerName}\` */;
DELIMITER ;;
${triggerStmt} ;;
DELIMITER ;\n\n`);
  }

  // Footer
  await writeChunk(sqlStream, `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
-- End of dump\n`);

  await new Promise(resolve => sqlStream.end(resolve));

  // Rename temp SQL to final SQL
  await rename(tempSqlPath, finalSqlPath);

  // Write Manifest
  console.log('📝 Saving images_manifest.json...');
  await writeFile(
    join(baseBackupDir, 'images_manifest.json'),
    JSON.stringify({
      generatedAt: now.toISOString(),
      totalImages: totalImagesExported,
      totalBytes: totalImagesBytes,
      totalMegabytes: (totalImagesBytes / (1024 * 1024)).toFixed(2),
      images: manifest
    }, null, 2),
    'utf8'
  );

  // Write Summary
  const sqlStat = await stat(finalSqlPath);
  const summary = {
    backupDate: now.toISOString(),
    host: url.hostname,
    database: dbName,
    sqlFile: {
      path: finalSqlPath,
      sizeBytes: sqlStat.size,
      sizeMB: (sqlStat.size / (1024 * 1024)).toFixed(2)
    },
    images: {
      directory: imagesDir,
      totalCount: totalImagesExported,
      totalBytes: totalImagesBytes,
      totalMB: (totalImagesBytes / (1024 * 1024)).toFixed(2)
    },
    tables: tableStats
  };

  await writeFile(
    join(baseBackupDir, 'backup_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  // Write README
  const readmeContent = `# نسخة احتياطية كاملة — متجر «الجيل العربي الرقمي»
تاريخ النسخ: ${now.toLocaleDateString('ar-YE')} - ${now.toLocaleTimeString('ar-YE')} (${now.toISOString()})
قاعدة البيانات: \`${dbName}\` على \`${url.hostname}\`

---

## محتويات النسخة الاحتياطية

1. **ملف قاعدة البيانات الشامل (\`database_${dbName}.sql\`):**
   - الحجم: ${(sqlStat.size / (1024 * 1024)).toFixed(2)} ميجابايت.
   - يحتوي على كافة الجداول (${tables.length} جدولاً)، والفهارس، والقيود الخارجية (Foreign Keys)، ومشغلات التدقيق (Triggers).
   - يحتوي على كامل البيانات بما في ذلك بيانات الصور الثنائية (Hex-blobs) لضمان استرجاع كامل وشامل بنقرة واحدة.

2. **مجلد الصور المستوردة (\`images/\`):**
   - إجمالي الصور: ${totalImagesExported} صورة.
   - الحجم الكلي: ${(totalImagesBytes / (1024 * 1024)).toFixed(2)} ميجابايت.
   - جميع الصور مستخرجة بصيغتها الأصلية (\`.webp\` / \`.jpg\`) وبأعلى جودة.

3. **فهرس الصور (\`images_manifest.json\`):**
   - يربط كل صورة برقم المنتج، اسم المنتج، الموديل، الفئة، والاسم البديل (Alt text).

4. **ملخص الجداول (\`backup_summary.json\`):**
   - تفاصيل عدد السجلات في كل جدول.

---

## طريقة استرجاع قاعدة البيانات

### الطريقة 1: عبر سطر الأوامر (MySQL CLI):
\`\`\`bash
mysql -u <USER> -p -h <HOST> <DATABASE_NAME> < database_${dbName}.sql
\`\`\`

### الطريقة 2: عبر سكربت المشروع:
\`\`\`bash
RESTORE_DATABASE_URL="mysql://<user>:<pass>@<host>:3306/<empty_db>" npm run db:restore -- ../backups/backup_${dateStr}/database_${dbName}.sql
\`\`\`

### الطريقة 3: عبر لوحة التحكم (phpMyAdmin):
- فتح phpMyAdmin -> اختيار قاعدة البيانات -> تبويب **Import** -> اختيار الملف \`database_${dbName}.sql\`.
`;

  await writeFile(join(baseBackupDir, 'README.md'), readmeContent, 'utf8');

  // Also create a copy in lenis/.backups
  const localBackupCopy = resolve('.backups', `u498439850_alar-${Date.now()}.sql`);
  console.log(`📋 Copying SQL file to internal backups folder: ${localBackupCopy}`);
  const fs = await import('node:fs/promises');
  await fs.copyFile(finalSqlPath, localBackupCopy);

  console.log('====================================================');
  console.log('🎉 Full Backup Successfully Completed!');
  console.log(`📁 Saved to: ${baseBackupDir}`);
  console.log(`📊 SQL Size: ${(sqlStat.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🖼️ Exported Images: ${totalImagesExported} (${(totalImagesBytes / (1024 * 1024)).toFixed(2)} MB)`);
  console.log('====================================================');

} catch (err) {
  console.error('❌ Backup Failed:', err);
  if (await fileExists(tempSqlPath)) {
    await unlink(tempSqlPath).catch(() => {});
  }
  process.exit(1);
} finally {
  if (activeConn) {
    try { await activeConn.end(); } catch {}
  }
  await pool.end();
}
