import type { FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient, type LeadStatus } from '@prisma/client';
import type { AppConfig } from './config.js';
import { ApiError } from './errors.js';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const LeadSourceEnum = z.enum([
  'brief_builder', 'quote_form', 'contact_form', 'product_inquiry',
  'whatsapp_click', 'walk_in', 'phone', 'manual', 'exhibition_contest',
]);
const LeadStatusEnum = z.enum(['new', 'contacted', 'quoted', 'won', 'lost']);
const ActivityTypeEnum = z.enum(['note', 'call', 'whatsapp', 'status_change', 'assignment']);
const CustomerTypeEnum = z.enum(['individual', 'business']);
const CurrencyEnum = z.enum(['USD', 'YER']);
const QuoteStatusEnum = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);

const LeadCreateSchema = z.object({
  source: LeadSourceEnum,
  status: LeadStatusEnum.default('new'),
  customerId: z.string().optional(),
  productId: z.string().optional(),
  assignedToId: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  lostReason: z.string().max(500).optional(),
  // Quick-create customer inline if no customerId
  customerName: z.string().max(150).optional(),
  customerPhone: z.string().max(16).optional(),
  customerEmail: z.string().email().max(254).optional(),
  customerCity: z.string().max(100).optional(),
  customerType: CustomerTypeEnum.default('individual'),
});

const LeadUpdateSchema = z.object({
  status: LeadStatusEnum.optional(),
  assignedToId: z.string().nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  lostReason: z.string().max(500).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const ActivityCreateSchema = z.object({
  type: ActivityTypeEnum,
  body: z.string().trim().min(1).max(2000),
});

const CustomerCreateSchema = z.object({
  name: z.string().max(150).optional(),
  phone: z.string().max(16).optional(),
  email: z.string().email().max(254).optional(),
  city: z.string().max(100).optional(),
  type: CustomerTypeEnum.default('individual'),
  company: z.string().max(150).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
  firstSource: LeadSourceEnum.default('manual'),
  marketingConsent: z.boolean().default(false),
});

const QuoteCreateSchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  currency: CurrencyEnum.default('USD'),
  items: z.array(z.object({
    productId: z.string().optional(),
    label: z.object({ ar: z.string(), en: z.string() }),
    qty: z.number().int().positive().default(1),
    unitPrice: z.number().positive(),
    sort: z.number().int().default(0),
  })).min(1),
  discount: z.number().min(0).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.record(z.string(), z.unknown()).optional(),
});

const QuoteUpdateSchema = z.object({
  status: QuoteStatusEnum.optional(),
  validUntil: z.string().datetime().nullable().optional(),
  notes: z.record(z.string(), z.unknown()).optional(),
});

export async function crmRoutes(app: FastifyInstance, db: PrismaClient, config: AppConfig) {
  const crmRead = { permission: 'crm.read' as const };
  const crmEdit = { permission: 'crm.edit' as const };

  // ══════════════════════════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════════════════════════

  // GET /api/admin/crm/leads
  app.get('/crm/leads', { config: crmRead }, async request => {
    const q = z.object({
      status: LeadStatusEnum.optional(),
      source: LeadSourceEnum.optional(),
      assignedToId: z.string().optional(),
      productId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      overdue: z.coerce.boolean().default(false),
    }).parse(request.query);

    const closedStatuses: LeadStatus[] = ['won', 'lost'];
    const where: Prisma.LeadWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.source ? { source: q.source } : {}),
      ...(q.assignedToId ? { assignedToId: q.assignedToId } : {}),
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.overdue ? { nextFollowUpAt: { lt: new Date() }, status: { notIn: closedStatuses } } : {}),
    };

    const [items, total] = await db.$transaction([
      db.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, type: true } },
          product: {
            select: {
              id: true, title: true, model: true, category: true,
              images: { take: 1, include: { media: { select: { originalPath: true } } } },
            }
          },
          assignedTo: { select: { id: true, name: true, role: true } },
          _count: { select: { activities: true } },
        },
      }),
      db.lead.count({ where }),
    ]);

    // Summary counts by status
    const statusCounts = await db.lead.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count._all])),
    };
  });

  // GET /api/admin/crm/leads/:id
  app.get('/crm/leads/:id', { config: crmRead }, async request => {
    const id = (request.params as { id: string }).id;
    const lead = await db.lead.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        product: {
          select: {
            id: true, title: true, model: true, category: true, slug: true,
            priceUsd: true, priceYer: true, stock: true,
            images: { take: 1, include: { media: { select: { originalPath: true } } } },
          }
        },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        activities: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });
    return lead;
  });

  // POST /api/admin/crm/leads
  app.post('/crm/leads', { config: crmEdit }, async (request, reply) => {
    const input = LeadCreateSchema.parse(request.body);
    const lead = await transaction(db, async tx => {
      let customerId = input.customerId;

      // Auto-create customer if inline data provided
      if (!customerId && (input.customerName || input.customerPhone)) {
        // Avoid duplicate phone
        if (input.customerPhone) {
          const existing = await tx.customer.findFirst({ where: { phone: input.customerPhone } });
          if (existing) {
            customerId = existing.id;
          }
        }
        if (!customerId) {
          const newCustomer = await tx.customer.create({
            data: {
              name: input.customerName,
              phone: input.customerPhone,
              email: input.customerEmail,
              city: input.customerCity,
              type: input.customerType,
              firstSource: input.source,
              tags: [],
            },
          });
          customerId = newCustomer.id;
        }
      }

      const created = await tx.lead.create({
        data: {
          source: input.source,
          status: input.status,
          customerId: customerId ?? null,
          productId: input.productId ?? null,
          assignedToId: input.assignedToId ?? null,
          nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
          payload: (input.payload ?? {}) as never,
          lostReason: input.lostReason,
        },
      });

      // Log creation activity
      await tx.leadActivity.create({
        data: {
          leadId: created.id,
          userId: request.auth!.user.id,
          type: 'note',
          body: `تم إنشاء الاستفسار من ${request.auth!.user.name}`,
        },
      });

      await audit(tx, config, request, { action: 'lead.created', entity: 'Lead', entityId: created.id, after: { source: input.source, status: input.status } });
      return created;
    });
    return reply.code(201).send(lead);
  });

  // PATCH /api/admin/crm/leads/:id
  app.patch('/crm/leads/:id', { config: crmEdit }, async request => {
    const id = (request.params as { id: string }).id;
    const input = LeadUpdateSchema.parse(request.body);
    return transaction(db, async tx => {
      const before = await tx.lead.findUniqueOrThrow({ where: { id } });
      const updated = await tx.lead.update({
        where: { id },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
          ...(input.nextFollowUpAt !== undefined ? { nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null } : {}),
          ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
          ...(input.payload !== undefined ? { payload: input.payload as never } : {}),
        },
      });

      // Auto-log status changes
      if (input.status && input.status !== before.status) {
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: request.auth!.user.id,
            type: 'status_change',
            body: `تغيير الحالة من "${before.status}" إلى "${input.status}"${input.lostReason ? ` — السبب: ${input.lostReason}` : ''}`,
          },
        });
      }

      if (input.assignedToId !== undefined && input.assignedToId !== before.assignedToId) {
        const assignee = input.assignedToId ? await tx.user.findUnique({ where: { id: input.assignedToId }, select: { name: true } }) : null;
        await tx.leadActivity.create({
          data: {
            leadId: id,
            userId: request.auth!.user.id,
            type: 'assignment',
            body: assignee ? `تم تعيين الاستفسار إلى ${assignee.name}` : 'تم إلغاء تعيين الاستفسار',
          },
        });
      }

      await audit(tx, config, request, { action: 'lead.updated', entity: 'Lead', entityId: id, before, after: updated });
      return updated;
    });
  });

  // POST /api/admin/crm/leads/:id/activities
  app.post('/crm/leads/:id/activities', { config: crmEdit }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const input = ActivityCreateSchema.parse(request.body);
    await db.lead.findUniqueOrThrow({ where: { id } }); // 404 if not found
    const activity = await db.leadActivity.create({
      data: {
        leadId: id,
        userId: request.auth!.user.id,
        type: input.type,
        body: input.body,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return reply.code(201).send(activity);
  });

  // ══════════════════════════════════════════════════════════════
  // CUSTOMERS (CRM contacts — not CustomerAccount store accounts)
  // ══════════════════════════════════════════════════════════════

  // GET /api/admin/crm/customers
  app.get('/crm/customers', { config: crmRead }, async request => {
    const q = z.object({
      q: z.string().default(''),
      type: CustomerTypeEnum.optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query);

    const where = {
      deletedAt: null,
      ...(q.type ? { type: q.type } : {}),
      ...(q.q ? {
        OR: [
          { name: { contains: q.q } },
          { phone: { contains: q.q } },
          { email: { contains: q.q } },
          { company: { contains: q.q } },
        ],
      } : {}),
    };

    const [items, total] = await db.$transaction([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          _count: { select: { leads: true, quotes: true, sales: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  // GET /api/admin/crm/customers/:id
  app.get('/crm/customers/:id', { config: crmRead }, async request => {
    const id = (request.params as { id: string }).id;
    return db.customer.findUniqueOrThrow({
      where: { id },
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, title: true, model: true } },
            assignedTo: { select: { id: true, name: true } },
            _count: { select: { activities: true } },
          },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        sales: { orderBy: { soldAt: 'desc' } },
      },
    });
  });

  // POST /api/admin/crm/customers
  app.post('/crm/customers', { config: crmEdit }, async (request, reply) => {
    const input = CustomerCreateSchema.parse(request.body);
    const customer = await transaction(db, async tx => {
      if (input.phone) {
        const existing = await tx.customer.findFirst({ where: { phone: input.phone, deletedAt: null } });
        if (existing) throw new ApiError(409, 'already_exists');
      }
      const created = await tx.customer.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          type: input.type,
          company: input.company,
          notes: input.notes,
          tags: input.tags as never,
          firstSource: input.firstSource,
          marketingConsent: input.marketingConsent,
          consentAt: input.marketingConsent ? new Date() : null,
        },
      });
      await audit(tx, config, request, { action: 'customer.created', entity: 'Customer', entityId: created.id, after: { name: created.name, phone: created.phone } });
      return created;
    });
    return reply.code(201).send(customer);
  });

  // PATCH /api/admin/crm/customers/:id
  app.patch('/crm/customers/:id', { config: crmEdit }, async request => {
    const id = (request.params as { id: string }).id;
    const input = CustomerCreateSchema.partial().parse(request.body);
    return transaction(db, async tx => {
      const before = await tx.customer.findUniqueOrThrow({ where: { id } });
      const after = await tx.customer.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.company !== undefined ? { company: input.company } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.tags !== undefined ? { tags: input.tags as never } : {}),
          ...(input.marketingConsent !== undefined ? {
            marketingConsent: input.marketingConsent,
            consentAt: input.marketingConsent ? (before.consentAt ?? new Date()) : before.consentAt,
          } : {}),
        },
      });
      await audit(tx, config, request, { action: 'customer.updated', entity: 'Customer', entityId: id, before, after });
      return after;
    });
  });

  // ══════════════════════════════════════════════════════════════
  // QUOTES
  // ══════════════════════════════════════════════════════════════

  // GET /api/admin/crm/quotes
  app.get('/crm/quotes', { config: crmRead }, async request => {
    const q = z.object({
      status: QuoteStatusEnum.optional(),
      customerId: z.string().optional(),
      leadId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }).parse(request.query);

    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.leadId ? { leadId: q.leadId } : {}),
    };

    const [items, total] = await db.$transaction([
      db.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: true,
        },
      }),
      db.quote.count({ where }),
    ]);

    return { items, total, page: q.page, pageSize: q.pageSize };
  });

  // POST /api/admin/crm/quotes
  app.post('/crm/quotes', { config: crmEdit }, async (request, reply) => {
    const input = QuoteCreateSchema.parse(request.body);
    const quote = await transaction(db, async tx => {
      const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const total = Math.max(0, subtotal - input.discount);
      const created = await tx.quote.create({
        data: {
          leadId: input.leadId ?? null,
          customerId: input.customerId ?? null,
          currency: input.currency,
          subtotal,
          discount: input.discount,
          total,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: (input.notes ?? null) as never,
          items: {
            create: input.items.map((item, idx) => ({
              productId: item.productId ?? null,
              label: item.label as never,
              qty: item.qty,
              unitPrice: item.unitPrice,
              currency: input.currency,
              sort: item.sort ?? idx,
            })),
          },
        },
        include: { items: true },
      });

      // Auto-log on the lead
      if (input.leadId) {
        await tx.leadActivity.create({
          data: {
            leadId: input.leadId,
            userId: request.auth!.user.id,
            type: 'status_change',
            body: `تم إنشاء عرض سعر بمبلغ ${total.toFixed(2)} ${input.currency}`,
          },
        });
      }

      await audit(tx, config, request, { action: 'quote.created', entity: 'Quote', entityId: created.id, after: { total, currency: input.currency } });
      return created;
    });
    return reply.code(201).send(quote);
  });

  // PATCH /api/admin/crm/quotes/:id
  app.patch('/crm/quotes/:id', { config: crmEdit }, async request => {
    const id = (request.params as { id: string }).id;
    const input = QuoteUpdateSchema.parse(request.body);
    return transaction(db, async tx => {
      const before = await tx.quote.findUniqueOrThrow({ where: { id } });
      const after = await tx.quote.update({
        where: { id },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.validUntil !== undefined ? { validUntil: input.validUntil ? new Date(input.validUntil) : null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes as never } : {}),
        },
      });
      await audit(tx, config, request, { action: 'quote.updated', entity: 'Quote', entityId: id, before, after });
      return after;
    });
  });

  // ══════════════════════════════════════════════════════════════
  // CRM DASHBOARD SUMMARY (for admin dashboard widget)
  // ══════════════════════════════════════════════════════════════

  // GET /api/admin/crm/summary
  app.get('/crm/summary', { config: crmRead }, async () => {
    const [newLeads, overdueFollowups, recentLeads, openQuotes] = await Promise.all([
      db.lead.count({ where: { status: 'new' } }),
      db.lead.count({ where: { nextFollowUpAt: { lt: new Date() }, status: { notIn: ['won', 'lost'] } } }),
      db.lead.findMany({
        where: { status: { notIn: ['won', 'lost'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { name: true, phone: true } },
          product: { select: { title: true, model: true, images: { take: 1, include: { media: { select: { originalPath: true } } } } } },
        },
      }),
      db.quote.count({ where: { status: { in: ['draft', 'sent'] } } }),
    ]);

    return { newLeads, overdueFollowups, recentLeads, openQuotes };
  });
}
