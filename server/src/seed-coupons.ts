import { createDb } from './db.js';
import { loadConfig } from './config.js';
import { Prisma } from '@prisma/client';

const db = createDb(loadConfig().DATABASE_URL);

async function main() {
  const initialCoupons = [
    {
      code: 'ALJEEL10',
      title: { ar: 'خصم الكاش والطلب الفوري (10%)', en: 'Instant Cash Discount (10%)' },
      description: {
        ar: 'خصم 10% على إجمالي سلة المشتريات بحد أقصى 50$',
        en: '10% discount on cart subtotal up to $50 max cap',
      },
      discountType: 'percentage',
      discountValue: new Prisma.Decimal('10.00'),
      maxDiscountUsd: new Prisma.Decimal('50.00'),
      minOrderAmountUsd: new Prisma.Decimal('50.00'),
      usageLimitPerCustomer: 2,
      isPublic: true,
      active: true,
    },
    {
      code: 'WELCOME',
      title: { ar: 'خصم الترحيب للعملاء الجدد ($15)', en: 'Welcome Discount ($15 Off)' },
      description: {
        ar: 'خصم 15$ مخصص لطلبك الأول في المتجر عند الشراء بـ 100$ فأكثر',
        en: '$15 off on your first store order when spending $100 or more',
      },
      discountType: 'fixed_amount',
      discountValue: new Prisma.Decimal('15.00'),
      minOrderAmountUsd: new Prisma.Decimal('100.00'),
      firstOrderOnly: true,
      usageLimitPerCustomer: 1,
      isPublic: true,
      active: true,
    },
    {
      code: 'SANAA_FREE',
      title: { ar: 'توصيل مجاني في صنعاء', en: 'Free Delivery Sana\'a' },
      description: {
        ar: 'توصيل مجاني لجميع الطلبات داخل أمانة العاصمة صنعاء',
        en: 'Free local delivery across Sana\'a for all orders',
      },
      discountType: 'free_shipping',
      discountValue: new Prisma.Decimal('0.00'),
      minOrderAmountUsd: new Prisma.Decimal('30.00'),
      isPublic: true,
      active: true,
    },
  ];

  for (const c of initialCoupons) {
    const existing = await db.coupon.findUnique({ where: { code: c.code } });
    if (!existing) {
      await db.coupon.create({ data: c });
      console.log(`Created default coupon: ${c.code}`);
    } else {
      console.log(`Coupon ${c.code} already exists.`);
    }
  }

  console.log('Coupons seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
