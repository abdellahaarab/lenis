import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { randomInt, createHash } from 'node:crypto';
import type { AppConfig } from './config.js';
import { ApiError } from './errors.js';
import { can } from '@aljeel/shared';

// Helper to normalize Arabic digits and clean phone numbers
export function normalizePhone(rawPhone: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let cleaned = rawPhone.trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(arabicDigits[i], String(i));
  }
  // Remove non-digit chars except leading plus
  cleaned = cleaned.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('00967')) {
    cleaned = '+967' + cleaned.slice(5);
  } else if (cleaned.startsWith('967') && !cleaned.startsWith('+')) {
    cleaned = '+967' + cleaned.slice(3);
  } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
    cleaned = '+967' + cleaned;
  }
  return cleaned;
}

export async function ensureDefaultContest(db: PrismaClient) {
  const existing = await db.contest.findFirst({
    where: { isActive: true },
    include: { prizes: { orderBy: { sort: 'asc' } } },
  });
  if (existing) return existing;

  // Create default exhibition contest with starter prizes
  const contest = await db.contest.create({
    data: {
      slug: 'expo-2026',
      title: {
        ar: 'مسابقة جناح الجيل العربي الرقمي — معرض التكنولوجيا 2026',
        en: 'Al-Jeel Al-Arabi Tech Expo Contest 2026',
      },
      description: {
        ar: 'سحب رقمي مباشر وتفاعلي لزوار الجناح على لابتوبات أعمال، كاميرات مراقبة ذكية، وإكسسوارات تقنية فاخرة.',
        en: 'Live digital raffle for booth visitors on business laptops, smart CCTV cameras, and premium accessories.',
      },
      isActive: true,
      prizes: {
        create: [
          {
            title: { ar: 'لابتوب أعمال عالي الأداء (فئة ThinkPad / Dell)', en: 'High-Performance Business Laptop' },
            description: { ar: 'معالج Core i7 / ذاكرة 16GB / فحص جودة معتمد وضمان حقيقي', en: 'Core i7 / 16GB RAM / Certified Inspection & Warranty' },
            imageUrl: '/images/products/thinkpad-hero.webp',
            category: 'laptop',
            quantity: 1,
            sort: 1,
          },
          {
            title: { ar: 'منظومة كاميرات مراقبة ذكية Dahua بدقة 4K', en: 'Dahua 4K Smart CCTV Security System' },
            description: { ar: 'رؤية ليلية ملونة فائقة الوضوح + مراقبة مباشرة عبر تطبيق الجوال', en: 'Ultra HD Full-Color Night Vision + Mobile App Live View' },
            imageUrl: '/images/products/cctv-kit.webp',
            category: 'cctv',
            quantity: 2,
            sort: 2,
          },
          {
            title: { ar: 'باقة الملحقات التقنية المتكاملة (حقيبة + ماوس + محطة طاقة)', en: 'Executive Tech Accessories Pack' },
            description: { ar: 'حقيبة أعمال مقاومة للصدمات + ماوس لاسلكي مريح + بطارية شحن سريعة', en: 'Shockproof bag + ergonomic mouse + fast power bank' },
            imageUrl: '/images/products/accessories-pack.webp',
            category: 'accessory',
            quantity: 5,
            sort: 3,
          },
        ],
      },
    },
    include: { prizes: { orderBy: { sort: 'asc' } } },
  });

  return contest;
}

export async function publicContestRoutes(app: FastifyInstance, db: PrismaClient, _config: AppConfig) {
  // 1. Fetch active exhibition contest details & prizes
  app.get('/api/contest/active', async (_req, reply) => {
    reply.header('Cache-Control', 'no-cache');
    const contest = await ensureDefaultContest(db);
    const totalEntries = await db.contestEntry.count({ where: { contestId: contest.id } });
    const winnersCount = await db.contestEntry.count({ where: { contestId: contest.id, isWinner: true } });

    return {
      contest: {
        id: contest.id,
        slug: contest.slug,
        title: contest.title,
        description: contest.description,
        isActive: contest.isActive,
        startsAt: contest.startsAt,
        endsAt: contest.endsAt,
      },
      prizes: contest.prizes,
      stats: {
        totalEntries,
        winnersCount,
      },
    };
  });

  // 2. Submit contest entry (Registration with anti-cheat & deduplication)
  const EnterSchema = z.object({
    contestId: z.string().optional(),
    name: z.string().trim().min(3, 'Name is too short').max(100),
    phone: z.string().trim().min(8).max(25),
    city: z.string().trim().max(80).optional().default('صنعاء'),
    interests: z.array(z.string()).min(1, 'Please select at least one interest'),
    deviceHash: z.string().max(100).optional(),
    notes: z.string().max(300).optional(),
  });

  app.post('/api/contest/enter', async (req, reply) => {
    const parsed = EnterSchema.parse(req.body);
    const contest = await ensureDefaultContest(db);

    if (!contest.isActive) {
      throw new ApiError(400, 'contest_closed');
    }

    const cleanedPhone = normalizePhone(parsed.phone);
    if (cleanedPhone.length < 8) {
      throw new ApiError(400, 'invalid_phone_number');
    }

    // IP Hash for spam prevention
    const ip = req.ip || '127.0.0.1';
    const clientIpHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);

    // Anti-cheat 1: Check if phone already registered in this contest
    const existingByPhone = await db.contestEntry.findUnique({
      where: {
        contestId_phone: {
          contestId: contest.id,
          phone: cleanedPhone,
        },
      },
      include: { wonPrize: true },
    });

    if (existingByPhone) {
      // Instead of failing abruptly, return existing ticket gracefully
      return reply.code(200).send({
        ok: true,
        alreadyRegistered: true,
        message: 'أنت مسجل بالفعل في هذه المسابقة! إليك بيانات تذكرتك الخاصة:',
        ticket: {
          id: existingByPhone.id,
          ticketNumber: existingByPhone.ticketNumber,
          name: existingByPhone.name,
          phone: existingByPhone.phone,
          city: existingByPhone.city,
          interests: existingByPhone.interests,
          isWinner: existingByPhone.isWinner,
          wonPrize: existingByPhone.wonPrize?.title ?? null,
          createdAt: existingByPhone.createdAt,
        },
      });
    }

    // Anti-cheat 2: Device fingerprint check if provided
    if (parsed.deviceHash) {
      const existingByDevice = await db.contestEntry.findFirst({
        where: {
          contestId: contest.id,
          deviceHash: parsed.deviceHash,
        },
        include: { wonPrize: true },
      });

      if (existingByDevice) {
        return reply.code(200).send({
          ok: true,
          alreadyRegistered: true,
          message: 'تم التسجيل مسبقاً من هذا الجهاز! إليك تذكرتك:',
          ticket: {
            id: existingByDevice.id,
            ticketNumber: existingByDevice.ticketNumber,
            name: existingByDevice.name,
            phone: existingByDevice.phone,
            city: existingByDevice.city,
            interests: existingByDevice.interests,
            isWinner: existingByDevice.isWinner,
            wonPrize: existingByDevice.wonPrize?.title ?? null,
            createdAt: existingByDevice.createdAt,
          },
        });
      }
    }

    // Generate unique serial ticket number: e.g. JEEL-74892
    const randomSuffix = randomInt(10000, 99999);
    const count = await db.contestEntry.count({ where: { contestId: contest.id } });
    const ticketNumber = `JEEL-${(count + 1).toString().padStart(4, '0')}-${randomSuffix}`;

    // Execute atomic transaction: Create ContestEntry + Sync with Customer & Lead CRM
    const newEntry = await db.$transaction(async tx => {
      // 1. Create Contest Entry
      const entry = await tx.contestEntry.create({
        data: {
          contestId: contest.id,
          ticketNumber,
          name: parsed.name,
          phone: cleanedPhone,
          city: parsed.city,
          interests: parsed.interests,
          deviceHash: parsed.deviceHash ?? null,
          ipHash: clientIpHash,
          notes: parsed.notes ?? null,
        },
      });

      // 2. Upsert Customer in CRM
      let customer = await tx.customer.findFirst({
        where: { phone: cleanedPhone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: parsed.name,
            phone: cleanedPhone,
            city: parsed.city,
            firstSource: 'exhibition_contest',
            tags: ['expo-2026', 'contest-entrant', ...parsed.interests],
            marketingConsent: true,
            consentAt: new Date(),
          },
        });
      }

      // 3. Create Lead for exhibition sales follow-up
      await tx.lead.create({
        data: {
          customerId: customer.id,
          source: 'exhibition_contest',
          status: 'new',
          payload: {
            contestId: contest.id,
            ticketNumber,
            interests: parsed.interests,
            registeredAt: entry.createdAt.toISOString(),
          },
        },
      });

      return entry;
    });

    return reply.code(201).send({
      ok: true,
      alreadyRegistered: false,
      message: 'تم تسجيلك بنجاح! احتفظ برقم تذكرتك للسحب المباشر.',
      ticket: {
        id: newEntry.id,
        ticketNumber: newEntry.ticketNumber,
        name: newEntry.name,
        phone: newEntry.phone,
        city: newEntry.city,
        interests: newEntry.interests,
        isWinner: false,
        createdAt: newEntry.createdAt,
      },
    });
  });

  // 3. Look up ticket details by ticketNumber (e.g. for QR scanning or verification)
  app.get('/api/contest/ticket/:ticketNumber', async (req) => {
    const { ticketNumber } = z.object({ ticketNumber: z.string() }).parse(req.params);
    const entry = await db.contestEntry.findUnique({
      where: { ticketNumber },
      include: {
        contest: { select: { title: true, isActive: true } },
        wonPrize: true,
      },
    });

    if (!entry) throw new ApiError(404, 'ticket_not_found');

    return {
      ticketNumber: entry.ticketNumber,
      name: entry.name,
      phone: entry.phone.slice(0, 4) + '***' + entry.phone.slice(-3),
      interests: entry.interests,
      isWinner: entry.isWinner,
      wonPrize: entry.wonPrize?.title ?? null,
      claimedAt: entry.claimedAt,
      createdAt: entry.createdAt,
    };
  });
}

export async function contestAdminRoutes(admin: FastifyInstance, db: PrismaClient, _config: AppConfig) {
  // Admin overview of contest, participants, and live metrics
  admin.get('/contest/overview', async request => {
    if (!can(request.auth!.user.role, 'contest.manage') && !can(request.auth!.user.role, 'crm.read')) {
      throw new ApiError(403, 'forbidden');
    }

    const contest = await ensureDefaultContest(db);
    const [entries, prizes, totalCount, winnersCount] = await Promise.all([
      db.contestEntry.findMany({
        where: { contestId: contest.id },
        include: { wonPrize: true },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      db.contestPrize.findMany({
        where: { contestId: contest.id },
        orderBy: { sort: 'asc' },
        include: {
          winners: {
            select: { id: true, ticketNumber: true, name: true, phone: true, claimedAt: true, wonAt: true },
          },
        },
      }),
      db.contestEntry.count({ where: { contestId: contest.id } }),
      db.contestEntry.count({ where: { contestId: contest.id, isWinner: true } }),
    ]);

    // Aggregate interests breakdown
    const interestCounts: Record<string, number> = {};
    for (const e of entries) {
      if (Array.isArray(e.interests)) {
        for (const item of e.interests as string[]) {
          interestCounts[item] = (interestCounts[item] || 0) + 1;
        }
      }
    }

    return {
      contest,
      prizes,
      totalCount,
      winnersCount,
      recentEntries: entries,
      interestCounts,
    };
  });

  // Execute verifiable live raffle draw for a prize
  const DrawSchema = z.object({
    prizeId: z.string(),
    excludeEntryIds: z.array(z.string()).optional(),
  });

  admin.post('/contest/draw', async request => {
    if (!can(request.auth!.user.role, 'contest.manage') && !can(request.auth!.user.role, 'crm.edit')) {
      throw new ApiError(403, 'forbidden');
    }

    const { prizeId, excludeEntryIds = [] } = DrawSchema.parse(request.body);
    const prize = await db.contestPrize.findUnique({
      where: { id: prizeId },
      include: { contest: true, winners: true },
    });

    if (!prize) throw new ApiError(404, 'prize_not_found');

    // Get all non-winner eligible entries
    const eligibleEntries = await db.contestEntry.findMany({
      where: {
        contestId: prize.contestId,
        isWinner: false,
        id: { notIn: excludeEntryIds },
      },
      select: {
        id: true,
        ticketNumber: true,
        name: true,
        phone: true,
        city: true,
        interests: true,
      },
    });

    if (eligibleEntries.length === 0) {
      throw new ApiError(400, 'no_eligible_entrants');
    }

    // Cryptographically secure random selection
    const randomIndex = randomInt(0, eligibleEntries.length);
    const chosen = eligibleEntries[randomIndex];

    // Record winner and draw log in transaction
    const winner = await db.$transaction(async tx => {
      const updated = await tx.contestEntry.update({
        where: { id: chosen.id },
        data: {
          isWinner: true,
          wonPrizeId: prize.id,
          wonAt: new Date(),
        },
      });

      await tx.contestDrawLog.create({
        data: {
          contestId: prize.contestId,
          prizeId: prize.id,
          entryId: chosen.id,
          drawnBy: request.auth?.user?.name ?? 'Admin',
        },
      });

      return updated;
    });

    return {
      ok: true,
      prize: { id: prize.id, title: prize.title },
      winner: {
        id: winner.id,
        ticketNumber: winner.ticketNumber,
        name: winner.name,
        phone: winner.phone,
        city: winner.city,
        wonAt: winner.wonAt,
      },
      remainingEligibleCount: eligibleEntries.length - 1,
    };
  });

  // Re-draw if entrant is absent or disqualified
  admin.post('/contest/draw/redraw', async request => {
    if (!can(request.auth!.user.role, 'contest.manage')) throw new ApiError(403, 'forbidden');
    const { previousWinnerId, reason } = z.object({
      previousWinnerId: z.string(),
      reason: z.string().optional(),
    }).parse(request.body);

    const prev = await db.contestEntry.findUnique({ where: { id: previousWinnerId } });
    if (!prev) throw new ApiError(404, 'entry_not_found');

    await db.contestEntry.update({
      where: { id: previousWinnerId },
      data: {
        isWinner: false,
        wonPrizeId: null,
        wonAt: null,
        notes: reason ? `استبعاد: ${reason}` : 'استبعاد في السحب المباشر (عدم حضور)',
      },
    });

    return { ok: true, resetEntryId: previousWinnerId };
  });

  // Confirm prize claim by booth staff
  admin.post('/contest/claim', async request => {
    if (!can(request.auth!.user.role, 'contest.manage') && !can(request.auth!.user.role, 'crm.edit')) {
      throw new ApiError(403, 'forbidden');
    }

    const { ticketNumber } = z.object({ ticketNumber: z.string() }).parse(request.body);
    const entry = await db.contestEntry.findUnique({
      where: { ticketNumber },
      include: { wonPrize: true },
    });

    if (!entry) throw new ApiError(404, 'ticket_not_found');
    if (!entry.isWinner) throw new ApiError(400, 'entry_not_winner');

    const updated = await db.contestEntry.update({
      where: { id: entry.id },
      data: { claimedAt: new Date() },
    });

    return {
      ok: true,
      ticketNumber: updated.ticketNumber,
      claimedAt: updated.claimedAt,
      prize: entry.wonPrize?.title,
    };
  });

  // Export all contest entrants to CSV with UTF-8 BOM for Arabic Excel
  admin.get('/contest/export', async (request, reply) => {
    if (!can(request.auth!.user.role, 'contest.manage') && !can(request.auth!.user.role, 'subscribers.export')) {
      throw new ApiError(403, 'forbidden');
    }

    const contest = await ensureDefaultContest(db);
    const entries = await db.contestEntry.findMany({
      where: { contestId: contest.id },
      include: { wonPrize: true },
      orderBy: { createdAt: 'asc' },
    });

    // Generate CSV lines
    const headers = ['رقم التذكرة', 'الاسم الكامل', 'رقم الهاتف', 'المدينة', 'الاهتمامات التقنية', 'تاريخ التسجيل', 'هل فاز؟', 'الجائزة', 'تاريخ الاستلام'];
    const rows = entries.map(e => {
      const interestsStr = Array.isArray(e.interests) ? (e.interests as string[]).join(' + ') : '';
      const prizeTitle = e.wonPrize ? (typeof e.wonPrize.title === 'object' && e.wonPrize.title ? (e.wonPrize.title as Record<string, string>).ar : String(e.wonPrize.title)) : '';
      return [
        `"${e.ticketNumber}"`,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.phone}"`,
        `"${(e.city || '').replace(/"/g, '""')}"`,
        `"${interestsStr.replace(/"/g, '""')}"`,
        `"${e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}"`,
        `"${e.isWinner ? 'نعم' : 'لا'}"`,
        `"${prizeTitle.replace(/"/g, '""')}"`,
        `"${e.claimedAt ? e.claimedAt.toISOString().replace('T', ' ').slice(0, 19) : ''}"`,
      ].join(',');
    });

    // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic characters flawlessly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="aljeel-expo-contest-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csvContent);
  });

  // Seed demo entrants on demand from admin interface
  admin.post('/contest/seed-demo', async request => {
    if (!can(request.auth!.user.role, 'contest.manage')) throw new ApiError(403, 'forbidden');
    const contest = await ensureDefaultContest(db);

    const mockNames = [
      { name: 'المهندس عبد الرحمن باوزير', city: 'المكلا', interests: ['laptops', 'accessories'] },
      { name: 'د. خالد الشرجبي', city: 'صنعاء', interests: ['security_cameras'] },
      { name: 'م. فاطمة العريقي', city: 'تعز', interests: ['laptops'] },
      { name: 'أ. وضاح سنان', city: 'صنعاء', interests: ['networking', 'power_energy'] },
      { name: 'مهند ماجد الذبحاني', city: 'صنعاء', interests: ['laptops'] },
      { name: 'سالم عمر بلحمر', city: 'عدن', interests: ['power_energy'] },
      { name: 'ريم طاهر القدسي', city: 'صنعاء', interests: ['security_cameras'] },
      { name: 'المهندس أكرم الحميري', city: 'إب', interests: ['laptops'] },
      { name: 'د. بليغ المخلافي', city: 'تعز', interests: ['accessories'] },
      { name: 'عمار ياسر الوادعي', city: 'صنعاء', interests: ['security_cameras'] },
      { name: 'ياسمين عبد الملك الكبسي', city: 'صنعاء', interests: ['laptops'] },
      { name: 'م. طارق الصبري', city: 'تعز', interests: ['networking'] },
    ];

    let added = 0;
    for (let i = 0; i < mockNames.length; i++) {
      const item = mockNames[i];
      const randomPhone = `+9677${randomInt(10000000, 99999999)}`;
      const ticketNumber = `JEEL-${(Date.now() + i).toString().slice(-4)}-${randomInt(10000, 99999)}`;

      const exists = await db.contestEntry.findFirst({ where: { contestId: contest.id, name: item.name } });
      if (!exists) {
        await db.contestEntry.create({
          data: {
            contestId: contest.id,
            ticketNumber,
            name: item.name,
            phone: randomPhone,
            city: item.city,
            interests: item.interests,
            deviceHash: `demo_device_${i}`,
            ipHash: 'demo_ip_hash',
            notes: 'مشترك تجريبي للمعرض',
          },
        });
        added++;
      }
    }

    return { ok: true, addedCount: added };
  });

  // Reset all winners for a fresh live draw presentation
  admin.post('/contest/reset-winners', async request => {
    if (!can(request.auth!.user.role, 'contest.manage')) throw new ApiError(403, 'forbidden');
    const contest = await ensureDefaultContest(db);

    await db.$transaction([
      db.contestEntry.updateMany({
        where: { contestId: contest.id },
        data: {
          isWinner: false,
          wonPrizeId: null,
          wonAt: null,
          claimedAt: null,
        },
      }),
      db.contestDrawLog.deleteMany({
        where: { contestId: contest.id },
      }),
    ]);

    return { ok: true, message: 'تمت إعادة ضبط جميع الفائزين بنجاح لبدء سحب مباشر جديد' };
  });
}




