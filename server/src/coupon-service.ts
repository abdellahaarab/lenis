import { Prisma, type PrismaClient, type Coupon } from '@prisma/client';
import type {
  CouponValidationResult,
  CouponStatus,
  CouponSummaryDto,
  CouponType,
  CouponUsageLogDto
} from '@aljeel/shared';
import type { SnapshotItem } from './commerce-cart.js';
import { ApiError } from './errors.js';

type Db = PrismaClient | Prisma.TransactionClient;

export function deriveCouponStatus(coupon: {
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  usageLimitTotal: number | null;
  usedCount: number;
}): CouponStatus {
  if (!coupon.active) return 'paused';
  const now = new Date();
  if (coupon.endDate && coupon.endDate < now) return 'expired';
  if (coupon.startDate && coupon.startDate > now) return 'scheduled';
  if (coupon.usageLimitTotal !== null && coupon.usedCount >= coupon.usageLimitTotal) return 'exhausted';
  return 'active';
}

export function couponToDto(coupon: Coupon & { _count?: { orders: number; usages: number } }): CouponSummaryDto {
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title as { ar: string; en: string },
    description: (coupon.description as { ar: string; en: string } | null) ?? null,
    discountType: coupon.discountType as CouponType,
    discountValue: Number(coupon.discountValue),
    maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
    minOrderAmountUsd: coupon.minOrderAmountUsd ? Number(coupon.minOrderAmountUsd) : null,
    maxOrderAmountUsd: coupon.maxOrderAmountUsd ? Number(coupon.maxOrderAmountUsd) : null,
    minItemQuantity: coupon.minItemQuantity,
    startDate: coupon.startDate ? coupon.startDate.toISOString() : null,
    endDate: coupon.endDate ? coupon.endDate.toISOString() : null,
    usageLimitTotal: coupon.usageLimitTotal,
    usageLimitPerCustomer: coupon.usageLimitPerCustomer,
    usedCount: coupon.usedCount,
    firstOrderOnly: coupon.firstOrderOnly,
    excludeDiscounted: coupon.excludeDiscounted,
    isPublic: coupon.isPublic,
    active: coupon.active,
    applicableCategories: (coupon.applicableCategories as string[]) || [],
    excludedCategories: (coupon.excludedCategories as string[]) || [],
    applicableBrands: (coupon.applicableBrands as string[]) || [],
    excludedBrands: (coupon.excludedBrands as string[]) || [],
    applicableProducts: (coupon.applicableProducts as string[]) || [],
    customerPhones: (coupon.customerPhones as string[]) || [],
    status: deriveCouponStatus(coupon),
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
    _count: coupon._count,
  };
}

export interface CouponEvaluationContext {
  code: string;
  items: SnapshotItem[];
  subtotalUsd: Prisma.Decimal;
  customerId?: string | null;
  customerPhone?: string | null;
  exchangeRate?: Prisma.Decimal | null;
}

export async function validateAndCalculateCoupon(
  db: Db,
  context: CouponEvaluationContext
): Promise<CouponValidationResult> {
  const normalizedCode = context.code.trim().toUpperCase();

  const coupon = await db.coupon.findFirst({
    where: { code: normalizedCode },
  });

  if (!coupon) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'not_found',
      message: {
        ar: 'كود الخصم غير موجود، يرجى التأكد من كتابته بشكل صحيح',
        en: 'Coupon code not found, please check the code and try again',
      },
    };
  }

  if (!coupon.active) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'inactive',
      message: {
        ar: 'هذا الكوبون غير مفعّل حالياً',
        en: 'This coupon is currently inactive',
      },
    };
  }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'not_started',
      message: {
        ar: `هذا الكوبون لم يبدأ بعد، سيكون متاحاً اعتباراً من ${coupon.startDate.toLocaleDateString('ar-YE')}`,
        en: `This coupon has not started yet, it will be valid from ${coupon.startDate.toLocaleDateString()}`,
      },
    };
  }

  if (coupon.endDate && coupon.endDate < now) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'expired',
      message: {
        ar: 'عذراً، لقد انتهت صلاحية هذا الكوبون',
        en: 'Sorry, this coupon has expired',
      },
    };
  }

  if (coupon.usageLimitTotal !== null && coupon.usedCount >= coupon.usageLimitTotal) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'exhausted',
      message: {
        ar: 'تم استنفاد جميع مرات استخدام هذا الكوبون',
        en: 'This coupon has reached its maximum total redemptions limit',
      },
    };
  }

  // Customer restrictions
  if (coupon.firstOrderOnly) {
    if (!context.customerId) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'login_required',
        message: {
          ar: 'يرجى تسجيل الدخول للتحقق من أهليتك لخصم الطلب الأول',
          en: 'Please log in to verify your first-order discount eligibility',
        },
      };
    }
    const completedOrders = await db.commerceOrder.count({
      where: {
        customerId: context.customerId,
        status: { not: 'cancelled' },
      },
    });
    if (completedOrders > 0) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'first_order_only',
        message: {
          ar: 'هذا الكوبون مخصص لطلبك الأول فقط، وسبق لك الطلب من المتجر',
          en: 'This coupon is valid for first-time orders only',
        },
      };
    }
  }

  if (context.customerId && coupon.usageLimitPerCustomer !== null) {
    const userUses = await db.couponUsage.count({
      where: {
        couponId: coupon.id,
        customerId: context.customerId,
      },
    });
    if (userUses >= coupon.usageLimitPerCustomer) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'customer_limit_reached',
        message: {
          ar: 'لقد استنفدت الحد الأقصى لاستخدام هذا الكوبون لحسابك',
          en: 'You have reached the maximum allowed uses for this coupon on your account',
        },
      };
    }
  }

  // VIP phone list
  const allowedPhones = (coupon.customerPhones as string[]) || [];
  if (allowedPhones.length > 0) {
    if (!context.customerPhone || !allowedPhones.includes(context.customerPhone)) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'not_eligible_customer',
        message: {
          ar: 'هذا الكوبون مخصص لحسابات وعملاء محددين',
          en: 'This coupon is restricted to specific customer accounts',
        },
      };
    }
  }

  // Minimum and Maximum spend
  if (coupon.minOrderAmountUsd) {
    if (context.subtotalUsd.lessThan(coupon.minOrderAmountUsd)) {
      const missing = coupon.minOrderAmountUsd.minus(context.subtotalUsd).toNumber();
      return {
        valid: false,
        code: normalizedCode,
        reason: 'min_spend_not_met',
        missingAmountUsd: missing,
        message: {
          ar: `الحد الأدنى لقيمة السلة لتفعيل هذا الكوبون هو $${coupon.minOrderAmountUsd.toFixed(2)}. أضف منتجات بقيمة $${missing.toFixed(2)} للاستفادة من الخصم`,
          en: `Minimum cart spend for this coupon is $${coupon.minOrderAmountUsd.toFixed(2)}. Add $${missing.toFixed(2)} more to qualify`,
        },
      };
    }
  }

  if (coupon.maxOrderAmountUsd) {
    if (context.subtotalUsd.greaterThan(coupon.maxOrderAmountUsd)) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'max_spend_exceeded',
        message: {
          ar: `الحد الأقصى المسموح لقيمة السلة لهذا الكوبون هو $${coupon.maxOrderAmountUsd.toFixed(2)}`,
          en: `Maximum cart spend allowed for this coupon is $${coupon.maxOrderAmountUsd.toFixed(2)}`,
        },
      };
    }
  }

  // Quantity check
  const totalItemQty = context.items.reduce((acc, item) => acc + item.quantity, 0);
  if (coupon.minItemQuantity && totalItemQty < coupon.minItemQuantity) {
    return {
      valid: false,
      code: normalizedCode,
      reason: 'min_qty_not_met',
      message: {
        ar: `يلزم وجود ${coupon.minItemQuantity} قطع على الأقل في السلة لتفعيل الكوبون`,
        en: `At least ${coupon.minItemQuantity} items required in cart to apply this coupon`,
      },
    };
  }

  // Item Scope & Targeting
  const applicableCategories = (coupon.applicableCategories as string[]) || [];
  const excludedCategories = (coupon.excludedCategories as string[]) || [];
  const applicableBrands = (coupon.applicableBrands as string[]) || [];
  const excludedBrands = (coupon.excludedBrands as string[]) || [];
  const applicableProducts = (coupon.applicableProducts as string[]) || [];

  const hasItemFiltering =
    applicableCategories.length > 0 ||
    excludedCategories.length > 0 ||
    applicableBrands.length > 0 ||
    excludedBrands.length > 0 ||
    applicableProducts.length > 0;

  let eligibleSubtotalUsd = new Prisma.Decimal(0);

  if (hasItemFiltering) {
    const productIds = [...new Set(context.items.map((i) => i.productId))];
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true, brandId: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of context.items) {
      if (!item.linePriceUsd) continue;
      const prod = productMap.get(item.productId);
      if (!prod) continue;

      if (applicableProducts.length > 0 && !applicableProducts.includes(item.productId)) continue;
      if (applicableBrands.length > 0 && !applicableBrands.includes(prod.brandId)) continue;
      if (excludedBrands.includes(prod.brandId)) continue;
      if (prod.category) {
        if (applicableCategories.length > 0 && !applicableCategories.includes(prod.category)) continue;
        if (excludedCategories.includes(prod.category)) continue;
      }

      eligibleSubtotalUsd = eligibleSubtotalUsd.add(new Prisma.Decimal(item.linePriceUsd));
    }

    if (eligibleSubtotalUsd.isZero()) {
      return {
        valid: false,
        code: normalizedCode,
        reason: 'no_eligible_items',
        message: {
          ar: 'لا توجد منتجات مشمولة بهذا الكوبون في سلة المشتريات',
          en: 'None of the items in your cart are eligible for this coupon',
        },
      };
    }
  } else {
    eligibleSubtotalUsd = context.subtotalUsd;
  }

  // Calculate discount
  let discountUsd = new Prisma.Decimal(0);
  let freeShipping = false;

  if (coupon.discountType === 'percentage') {
    let raw = eligibleSubtotalUsd.mul(coupon.discountValue).div(100);
    if (coupon.maxDiscountUsd && raw.greaterThan(coupon.maxDiscountUsd)) {
      raw = coupon.maxDiscountUsd;
    }
    discountUsd = raw;
  } else if (coupon.discountType === 'fixed_amount') {
    discountUsd = coupon.discountValue.greaterThan(eligibleSubtotalUsd)
      ? eligibleSubtotalUsd
      : coupon.discountValue;
  } else if (coupon.discountType === 'free_shipping') {
    freeShipping = true;
  }

  discountUsd = discountUsd.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  let totalUsd = context.subtotalUsd.minus(discountUsd);
  if (totalUsd.lessThan(0)) totalUsd = new Prisma.Decimal(0);

  const rate = context.exchangeRate;
  const discountYer = rate
    ? discountUsd.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2)
    : null;
  const totalYer = rate
    ? totalUsd.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2)
    : null;

  const titleObj = coupon.title as { ar: string; en: string };
  const descObj = coupon.description as { ar: string; en: string } | null;

  const savingsAr = freeShipping
    ? 'توصيل مجاني'
    : `وفرت $${discountUsd.toFixed(2)}${discountYer ? ` (~${Math.round(Number(discountYer)).toLocaleString()} ر.ي)` : ''}`;
  const savingsEn = freeShipping
    ? 'Free shipping applied'
    : `Saved $${discountUsd.toFixed(2)}${discountYer ? ` (~${Math.round(Number(discountYer)).toLocaleString()} YER)` : ''}`;

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      title: titleObj,
      description: descObj,
      discountType: coupon.discountType as CouponType,
      discountValue: Number(coupon.discountValue),
      maxDiscountUsd: coupon.maxDiscountUsd ? Number(coupon.maxDiscountUsd) : null,
      freeShipping,
    },
    discountUsd: discountUsd.toFixed(2),
    discountYer,
    totalUsd: totalUsd.toFixed(2),
    totalYer,
    savingsText: {
      ar: savingsAr,
      en: savingsEn,
    },
  };
}

export async function recordCouponRedemption(
  tx: Prisma.TransactionClient,
  params: {
    couponId: string;
    orderId: string;
    customerId: string;
    discountUsd: Prisma.Decimal;
    discountYer: Prisma.Decimal | null;
    orderSubtotalUsd: Prisma.Decimal;
    customerPhone?: string | null;
  }
) {
  // Update coupon atomic counter
  const updated = await tx.coupon.updateMany({
    where: {
      id: params.couponId,
      active: true,
    },
    data: {
      usedCount: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    throw new ApiError(409, 'coupon_invalid_or_inactive');
  }

  // Create usage audit log
  await tx.couponUsage.create({
    data: {
      couponId: params.couponId,
      orderId: params.orderId,
      customerId: params.customerId,
      discountUsd: params.discountUsd,
      discountYer: params.discountYer,
      orderSubtotalUsd: params.orderSubtotalUsd,
      customerPhone: params.customerPhone ?? null,
    },
  });
}
