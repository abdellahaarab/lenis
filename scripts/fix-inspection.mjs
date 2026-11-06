/**
 * fix-inspection.mjs
 * ------------------
 * One-off script: Updates all Product rows whose `inspection` column is an empty
 * JSON object {} to a proper default: { passed: false, date: null, notes: { ar: '', en: '' } }
 *
 * Run from the lenis folder:
 *   node scripts/fix-inspection.mjs
 */

import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';

config({ path: '.env', quiet: true });

const defaultInspection = JSON.stringify({ passed: false, date: null, notes: { ar: '', en: '' } });

const conn = await createConnection(process.env.DATABASE_URL);

// Find all products with missing inspection fields
const [rows] = await conn.execute(
  `SELECT id, model, inspection FROM Product`
);

let fixed = 0;
let skipped = 0;

for (const row of rows) {
  let insp = row.inspection;
  if (typeof insp === 'string') {
    try { insp = JSON.parse(insp); } catch { insp = {}; }
  }
  insp = insp ?? {};

  const needsFix =
    typeof insp.passed === 'undefined' ||
    typeof insp.date === 'undefined' ||
    !insp.notes;

  if (!needsFix) {
    skipped++;
    continue;
  }

  // Merge with defaults, keep any valid existing values
  const merged = {
    passed: typeof insp.passed === 'boolean' ? insp.passed : false,
    date: (typeof insp.date === 'string' || insp.date === null) ? insp.date : null,
    notes: {
      ar: insp.notes?.ar ?? '',
      en: insp.notes?.en ?? insp.notes?.ar ?? '',
    },
    ...(insp.checklist ? { checklist: insp.checklist } : {}),
  };

  await conn.execute(
    `UPDATE Product SET inspection = ? WHERE id = ?`,
    [JSON.stringify(merged), row.id]
  );

  console.log(`✅ Fixed: ${row.model} (${row.id})`);
  fixed++;
}

await conn.end();
console.log(`\nDone. Fixed: ${fixed} | Already OK: ${skipped}`);
