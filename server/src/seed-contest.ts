import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { ensureDefaultContest } from './routes-contest.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);

const sampleEntrants = [
  { name: 'المهندس عبد الرحمن باوزير', phone: '+967771234501', city: 'المكلا', interests: ['laptops', 'accessories'], notes: 'مطور برمجيات - يبحث عن لابتوب Core i7' },
  { name: 'د. خالد الشرجبي', phone: '+967733456702', city: 'صنعاء', interests: ['security_cameras'], notes: 'تأمين عيادة ومكتب استشاري بـ 4 كاميرات' },
  { name: 'م. فاطمة العريقي', phone: '+967711223303', city: 'تعز', interests: ['laptops'], notes: 'مهندسة معمارية - برامج Revit و 3D Max' },
  { name: 'أ. وضاح سنان', phone: '+967777889904', city: 'صنعاء', interests: ['networking', 'power_energy'], notes: 'تجهيز شبكة مكتبية وسيرفرات' },
  { name: 'مهند ماجد الذبحاني', phone: '+967735566705', city: 'صنعاء', interests: ['laptops'], notes: 'لابتوب ألعاب ومونتاج فيديو 4K' },
  { name: 'سالم عمر بلحمر', phone: '+967772345606', city: 'عدن', interests: ['power_energy'], notes: 'محطة طاقة وبطاريات للمنزل والمكتب' },
  { name: 'ريم طاهر القدسي', phone: '+967715678907', city: 'صنعاء', interests: ['security_cameras'], notes: 'كاميرات مراقبة ذكية مع رؤية ليلية' },
  { name: 'المهندس أكرم الحميري', phone: '+967774567808', city: 'إب', interests: ['laptops', 'accessories'], notes: 'لابتوب أعمال ThinkPad T14s' },
  { name: 'د. بليغ المخلافي', phone: '+967738901209', city: 'تعز', interests: ['accessories'], notes: 'ماوس مريح وحقيبة مضادة للصدمات' },
  { name: 'أنس ناصر الهمداني', phone: '+967779012310', city: 'صنعاء', interests: ['laptops'], notes: 'لابتوب فحص معتمد وضمان مكتوب' },
  { name: 'عمار ياسر الوادعي', phone: '+967732345611', city: 'صنعاء', interests: ['security_cameras'], notes: 'نظام كاميرات Dahua Full-Color' },
  { name: 'ياسمين عبد الملك الكبسي', phone: '+967714567812', city: 'صنعاء', interests: ['laptops'], notes: 'جرافيكس ديزاين وتصاميم سوشيال ميديا' },
  { name: 'م. طارق الصبري', phone: '+967776789013', city: 'تعز', interests: ['networking'], notes: 'أجهزة راوتر وسويتشات TP-Link' },
  { name: 'حسام فهد اليافعي', phone: '+967731234514', city: 'عدن', interests: ['laptops'], notes: 'لابتوب Dell Latitude للأعمال' },
  { name: 'بشير عبد القوي المقطري', phone: '+967778901215', city: 'صنعاء', interests: ['power_energy'], notes: 'إنفرترات وبطاريات شحن سريع' },
  { name: 'سارة نبيل غيلان', phone: '+967712345616', city: 'صنعاء', interests: ['accessories'], notes: 'سماعات عازلة للضوضاء وبطارية شحن' },
  { name: 'محمد صادق العماد', phone: '+967773456717', city: 'صنعاء', interests: ['security_cameras'], notes: 'كاميرات بدقة 4K لمستودع تجاري' },
  { name: 'عبد الله رشاد النعمان', phone: '+967736789018', city: 'تعز', interests: ['laptops'], notes: 'لابتوب محمول خفيف الوزن للجامعة' },
  { name: 'وفاء نجيب الصلوي', phone: '+967717890119', city: 'صنعاء', interests: ['laptops'], notes: 'لابتوب فئة رجال الأعمال' },
  { name: 'زياد منصور الشميري', phone: '+967775678920', city: 'الحديدة', interests: ['security_cameras', 'power_energy'], notes: 'كاميرات مع بطارية طاقة احتياطية' },
  { name: 'م. غمدان هزاع الصنوي', phone: '+967739012321', city: 'صنعاء', interests: ['networking'], notes: 'تجهيز كبائن شبكات وأسلاك Cat6' },
  { name: 'لؤي عادل بارجاء', phone: '+967774321022', city: 'المكلا', interests: ['laptops'], notes: 'لابتوب ThinkPad مع ضمان ممتد' },
  { name: 'هاجر إبراهيم العواضي', phone: '+967718901223', city: 'صنعاء', interests: ['laptops'], notes: 'طالبة هندسة حاسوب' },
  { name: 'معاذ عبد الرزاق الحكيمي', phone: '+967776543224', city: 'تعز', interests: ['power_energy'], notes: 'محطة طاقة شمسية للمنزل' },
  { name: 'د. نبيل أحمد الرداعي', phone: '+967734567825', city: 'ذمار', interests: ['security_cameras'], notes: 'تجهيز صيدلية بنظام مراقبة متكامل' },
];

export async function seedContestData() {
  console.log('🚀 Seeding realistic Expo contest data...');
  const contest = await ensureDefaultContest(db);

  // Update contest title and description to be extra rich
  await db.contest.update({
    where: { id: contest.id },
    data: {
      title: {
        ar: 'جناح الجيل العربي الرقمي — معرض التكنولوجيا والأعمال 2026',
        en: 'Al-Jeel Al-Arabi Tech & Business Expo 2026',
      },
      description: {
        ar: 'سحب رقمي مباشر وفوري أمام زوار المعرض على لابتوبات أعمال معتمدة الفحص والضمان، وأنظمة مراقبة ذكية 4K، وباقات ملحقات فاخرة.',
        en: 'Live verifiable digital raffle at the booth for certified business laptops, smart 4K CCTV systems, and executive gear.',
      },
      isActive: true,
    },
  });

  // Fetch prizes
  const prizes = await db.contestPrize.findMany({
    where: { contestId: contest.id },
    orderBy: { sort: 'asc' },
  });

  let createdCount = 0;
  for (let i = 0; i < sampleEntrants.length; i++) {
    const item = sampleEntrants[i];
    const ticketNumber = `JEEL-${(i + 1).toString().padStart(4, '0')}-${10000 + i * 37}`;

    const existing = await db.contestEntry.findUnique({
      where: {
        contestId_phone: {
          contestId: contest.id,
          phone: item.phone,
        },
      },
    });

    if (!existing) {
      // Create entrant
      const entry = await db.contestEntry.create({
        data: {
          contestId: contest.id,
          ticketNumber,
          name: item.name,
          phone: item.phone,
          city: item.city,
          interests: item.interests,
          deviceHash: `dev_seed_${i + 1}`,
          ipHash: `ip_hash_seed_${i + 1}`,
          notes: item.notes,
          createdAt: new Date(Date.now() - (sampleEntrants.length - i) * 12 * 60 * 1000), // Staggered creation times
        },
      });

      // Upsert Customer
      let customer = await db.customer.findFirst({ where: { phone: item.phone } });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            name: item.name,
            phone: item.phone,
            city: item.city,
            firstSource: 'exhibition_contest',
            tags: ['expo-2026', 'contest-entrant', ...item.interests],
            marketingConsent: true,
            consentAt: new Date(),
          },
        });
      }

      // Create Lead
      await db.lead.create({
        data: {
          customerId: customer.id,
          source: 'exhibition_contest',
          status: 'new',
          payload: {
            contestId: contest.id,
            ticketNumber,
            interests: item.interests,
            registeredAt: entry.createdAt.toISOString(),
            notes: item.notes,
          },
        },
      });

      createdCount++;
    }
  }

  // Pick 1 sample winner for the accessories pack to show a winner in the dashboard
  if (prizes.length >= 3) {
    const accessoryPrize = prizes[2];
    const firstNonWinner = await db.contestEntry.findFirst({
      where: { contestId: contest.id, isWinner: false },
      orderBy: { createdAt: 'asc' },
    });

    if (firstNonWinner) {
      await db.contestEntry.update({
        where: { id: firstNonWinner.id },
        data: {
          isWinner: true,
          wonPrizeId: accessoryPrize.id,
          wonAt: new Date(Date.now() - 30 * 60 * 1000),
          claimedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });

      await db.contestDrawLog.create({
        data: {
          contestId: contest.id,
          prizeId: accessoryPrize.id,
          entryId: firstNonWinner.id,
          drawnBy: 'المدير التنفيذي (سحب تجريبي)',
        },
      });
      console.log(`🏆 Sample winner seeded: ${firstNonWinner.name} (${firstNonWinner.ticketNumber})`);
    }
  }

  console.log(`✅ Done! Created ${createdCount} realistic exhibition contest entrants.`);
}

// If run directly via CLI
if (process.argv[1]?.endsWith('seed-contest.ts')) {
  seedContestData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
