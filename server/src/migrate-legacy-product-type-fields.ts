/**
 * Normalize legacy ProductType.fields entries so catalog APIs/admins consume
 * the current SpecField shape. Preview by default; pass --apply to persist.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { SpecField } from '@aljeel/shared';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

const db = createDb(loadConfig().DATABASE_URL);

function humanize(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase());
}

function normalizeFields(value: unknown) {
  if (!Array.isArray(value)) throw new Error('ProductType.fields is not an array');
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Invalid field at index ${index}`);
    const field = raw as Record<string, unknown>;
    const legacyType = field.valueType ?? field.type;
    const valueType = legacyType === 'select' ? 'single' : legacyType;
    const rawTitle = field.title && typeof field.title === 'object' ? field.title as Record<string, unknown> : {};
    const titleAr = typeof rawTitle.ar === 'string' ? rawTitle.ar : typeof field.label === 'string' ? field.label : '';
    const titleEn = typeof rawTitle.en === 'string' && rawTitle.en !== field.key
      ? rawTitle.en
      : humanize(String(field.key ?? ''));
    return SpecField.parse({
      key: field.key,
      title: { ar: titleAr, en: titleEn },
      valueType,
      unit: typeof field.unit === 'string' ? field.unit : null,
      options: Array.isArray(field.options) ? field.options : [],
      required: typeof field.required === 'boolean' ? field.required : false,
      filterable: typeof field.filterable === 'boolean' ? field.filterable : false,
      card: typeof field.card === 'boolean' ? field.card : false,
      sort: Number.isInteger(field.sort) ? field.sort : index,
    });
  });
}

async function main() {
  const types = await db.productType.findMany({ select: { id: true, title: true, fields: true, updatedAt: true } });
  const changes = types.flatMap(type => {
    const parsed = SpecField.array().safeParse(type.fields);
    if (parsed.success) return [];
    const fields = normalizeFields(type.fields);
    return [{ id: type.id, title: type.title, before: type.fields, fields, updatedAt: type.updatedAt }];
  });
  const summary = { mode: process.argv.includes('--apply') ? 'apply' : 'preview', invalidTemplatesFound: changes.length, templatesToNormalize: changes.map(({ id, fields }) => ({ id, fields: fields.length })) };

  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!changes.length) {
    console.log(JSON.stringify({ ...summary, updated: 0 }, null, 2));
    return;
  }

  const backupPath = join(process.cwd(), '.backups', `product-types-before-spec-normalization-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await mkdir(join(process.cwd(), '.backups'), { recursive: true });
  await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), types: changes }, null, 2), 'utf8');

  await db.$transaction(async tx => {
    for (const change of changes) {
      await tx.productType.update({ where: { id: change.id }, data: { fields: change.fields as Prisma.InputJsonValue } });
    }
    await tx.auditLog.create({
      data: {
        action: 'catalog.spec_templates.normalized',
        entity: 'ProductType',
        entityId: null,
        before: { invalidTemplatesFound: changes.length } as Prisma.InputJsonValue,
        after: { updated: changes.map(({ id, fields }) => ({ id, fieldCount: fields.length })), backupPath } as Prisma.InputJsonValue,
      },
    });
  }, { timeout: 30000, maxWait: 8000 });
  console.log(JSON.stringify({ ...summary, updated: changes.length, backupPath }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
