import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  CouponEdit,
  CouponValidate,
} from '@aljeel/shared';
import {
  deriveCouponStatus,
  validateAndCalculateCoupon,
  type CouponEvaluationContext,
} from '../src/coupon-service.js';

describe('Coupon Zod Schema Validation', () => {
  it('validates a correct percentage coupon input and auto-uppercases code', () => {
    const input = {
      code: 'save20',
      title: { ar: 'خصم 20%', en: '20% Off' },
      discountType: 'percentage' as const,
      discountValue: 20,
      maxDiscountUsd: 50,
      minOrderAmountUsd: 100,
    };
    const parsed = CouponEdit.parse(input);
    expect(parsed.code).toBe('SAVE20');
    expect(parsed.discountValue).toBe(20);
    expect(parsed.maxDiscountUsd).toBe(50);
  });

  it('rejects percentage discount greater than 100%', () => {
    const input = {
      code: 'SUPER150',
      title: { ar: 'خصم خيالي', en: '150% Off' },
      discountType: 'percentage' as const,
      discountValue: 150,
    };
    expect(() => CouponEdit.parse(input)).toThrow('Percentage discount cannot exceed 100%');
  });

  it('rejects negative discount values', () => {
    const input = {
      code: 'MINUS10',
      title: { ar: 'خصم سالب', en: 'Negative' },
      discountType: 'fixed_amount' as const,
      discountValue: -10,
    };
    expect(() => CouponEdit.parse(input)).toThrow();
  });

  it('normalizes code in CouponValidate', () => {
    const res = CouponValidate.parse({ code: '  eid_2026 ' });
    expect(res.code).toBe('EID_2026');
  });
});

describe('deriveCouponStatus', () => {
  it('returns paused when active is false', () => {
    expect(
      deriveCouponStatus({
        active: false,
        startDate: null,
        endDate: null,
        usageLimitTotal: 100,
        usedCount: 0,
      })
    ).toBe('paused');
  });

  it('returns expired when endDate is in past', () => {
    expect(
      deriveCouponStatus({
        active: true,
        startDate: null,
        endDate: new Date(Date.now() - 10000),
        usageLimitTotal: null,
        usedCount: 5,
      })
    ).toBe('expired');
  });

  it('returns scheduled when startDate is in future', () => {
    expect(
      deriveCouponStatus({
        active: true,
        startDate: new Date(Date.now() + 100000),
        endDate: null,
        usageLimitTotal: null,
        usedCount: 0,
      })
    ).toBe('scheduled');
  });

  it('returns exhausted when usageLimitTotal is met', () => {
    expect(
      deriveCouponStatus({
        active: true,
        startDate: null,
        endDate: null,
        usageLimitTotal: 50,
        usedCount: 50,
      })
    ).toBe('exhausted');
  });

  it('returns active when all conditions pass', () => {
    expect(
      deriveCouponStatus({
        active: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        usageLimitTotal: 100,
        usedCount: 12,
      })
    ).toBe('active');
  });
});

describe('validateAndCalculateCoupon calculation engine', () => {
  const dummyItems = [
    {
      variantId: 'v1',
      unitId: null,
      productId: 'p1',
      sku: 'SKU-1',
      title: { ar: 'جهاز 1', en: 'Device 1' },
      options: {},
      condition: 'A',
      inspection: {},
      defects: [],
      quantity: 1,
      unitPriceUsd: '200.00',
      linePriceUsd: '200.00',
      packageId: null,
      images: [],
      warrantyMonths: 12,
    },
    {
      variantId: 'v2',
      unitId: null,
      productId: 'p2',
      sku: 'SKU-2',
      title: { ar: 'جهاز 2', en: 'Device 2' },
      options: {},
      condition: 'A',
      inspection: {},
      defects: [],
      quantity: 1,
      unitPriceUsd: '100.00',
      linePriceUsd: '100.00',
      packageId: null,
      images: [],
      warrantyMonths: 6,
    },
  ];

  it('returns not_found when coupon does not exist', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => null,
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'UNKNOWN',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('300.00'),
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('not_found');
    }
  });

  it('returns min_spend_not_met and computes missing amount when subtotal is below minimum', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => ({
          id: 'c1',
          code: 'MIN500',
          title: { ar: 'خصم 500', en: 'Min 500' },
          active: true,
          discountType: 'percentage',
          discountValue: new Prisma.Decimal(10),
          minOrderAmountUsd: new Prisma.Decimal('500.00'),
          startDate: null,
          endDate: null,
          usageLimitTotal: null,
          usageLimitPerCustomer: 1,
          usedCount: 0,
          firstOrderOnly: false,
          applicableCategories: [],
          excludedCategories: [],
          applicableBrands: [],
          excludedBrands: [],
          applicableProducts: [],
          customerPhones: [],
        }),
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'MIN500',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('300.00'),
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('min_spend_not_met');
      expect(res.missingAmountUsd).toBe(200);
      expect(res.message.ar).toContain('500.00');
    }
  });

  it('correctly calculates percentage discount with max cap and exchange rate', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => ({
          id: 'c1',
          code: 'SALE20',
          title: { ar: 'خصم 20%', en: '20% Sale' },
          description: { ar: 'سقف أقصى 40 دولار', en: 'Max $40' },
          active: true,
          discountType: 'percentage',
          discountValue: new Prisma.Decimal(20), // 20% of 300 = 60, but max is 40!
          maxDiscountUsd: new Prisma.Decimal('40.00'),
          minOrderAmountUsd: new Prisma.Decimal('100.00'),
          startDate: null,
          endDate: null,
          usageLimitTotal: null,
          usageLimitPerCustomer: null,
          usedCount: 0,
          firstOrderOnly: false,
          applicableCategories: [],
          excludedCategories: [],
          applicableBrands: [],
          excludedBrands: [],
          applicableProducts: [],
          customerPhones: [],
        }),
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'SALE20',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('300.00'),
      exchangeRate: new Prisma.Decimal('250.00'),
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.discountUsd).toBe('40.00'); // capped at 40
      expect(res.totalUsd).toBe('260.00'); // 300 - 40
      expect(res.discountYer).toBe('10000.00'); // 40 * 250
      expect(res.totalYer).toBe('65000.00'); // 260 * 250
    }
  });

  it('correctly applies fixed amount discount', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => ({
          id: 'c2',
          code: 'FLAT25',
          title: { ar: 'خصم 25 دولار', en: '$25 Off' },
          active: true,
          discountType: 'fixed_amount',
          discountValue: new Prisma.Decimal('25.00'),
          maxDiscountUsd: null,
          minOrderAmountUsd: null,
          startDate: null,
          endDate: null,
          usageLimitTotal: null,
          usageLimitPerCustomer: null,
          usedCount: 0,
          firstOrderOnly: false,
          applicableCategories: [],
          excludedCategories: [],
          applicableBrands: [],
          excludedBrands: [],
          applicableProducts: [],
          customerPhones: [],
        }),
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'FLAT25',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('100.00'),
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.discountUsd).toBe('25.00');
      expect(res.totalUsd).toBe('75.00');
    }
  });

  it('correctly sets freeShipping flag for free_shipping coupon', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => ({
          id: 'c3',
          code: 'FREEDELIVERY',
          title: { ar: 'توصيل مجاني', en: 'Free Delivery' },
          active: true,
          discountType: 'free_shipping',
          discountValue: new Prisma.Decimal(0),
          maxDiscountUsd: null,
          minOrderAmountUsd: null,
          startDate: null,
          endDate: null,
          usageLimitTotal: null,
          usageLimitPerCustomer: null,
          usedCount: 0,
          firstOrderOnly: false,
          applicableCategories: [],
          excludedCategories: [],
          applicableBrands: [],
          excludedBrands: [],
          applicableProducts: [],
          customerPhones: [],
        }),
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'FREEDELIVERY',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('100.00'),
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.coupon.freeShipping).toBe(true);
      expect(res.discountUsd).toBe('0.00');
      expect(res.savingsText.ar).toBe('توصيل مجاني');
    }
  });

  it('enforces first_order_only and rejects returning customers', async () => {
    const mockDb = {
      coupon: {
        findFirst: async () => ({
          id: 'c4',
          code: 'WELCOME',
          title: { ar: 'أهلاً بك', en: 'Welcome' },
          active: true,
          discountType: 'percentage',
          discountValue: new Prisma.Decimal(10),
          maxDiscountUsd: null,
          minOrderAmountUsd: null,
          startDate: null,
          endDate: null,
          usageLimitTotal: null,
          usageLimitPerCustomer: 1,
          usedCount: 0,
          firstOrderOnly: true,
          applicableCategories: [],
          excludedCategories: [],
          applicableBrands: [],
          excludedBrands: [],
          applicableProducts: [],
          customerPhones: [],
        }),
      },
      commerceOrder: {
        count: async () => 2, // 2 prior orders!
      },
    } as any;

    const res = await validateAndCalculateCoupon(mockDb, {
      code: 'WELCOME',
      items: dummyItems,
      subtotalUsd: new Prisma.Decimal('100.00'),
      customerId: 'cust-123',
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('first_order_only');
    }
  });
});
