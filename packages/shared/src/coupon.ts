import { z } from 'zod';
import { BiText } from './commerce.js';

export const CouponTypeEnum = z.enum(['percentage', 'fixed_amount', 'free_shipping']);
export type CouponType = z.infer<typeof CouponTypeEnum>;

export const CouponStatusEnum = z.enum(['active', 'expired', 'scheduled', 'exhausted', 'paused']);
export type CouponStatus = z.infer<typeof CouponStatusEnum>;

export const CouponEdit = z.object({
  id: z.string().max(100).optional(),
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores')
    .transform(v => v.toUpperCase().trim()),
  title: BiText,
  description: BiText.optional().nullable(),
  discountType: CouponTypeEnum,
  discountValue: z.number().min(0, 'Discount value must be non-negative'),
  maxDiscountUsd: z.number().positive().nullable().optional(),
  minOrderAmountUsd: z.number().positive().nullable().optional(),
  maxOrderAmountUsd: z.number().positive().nullable().optional(),
  minItemQuantity: z.number().int().min(1).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  usageLimitTotal: z.number().int().min(1).nullable().optional(),
  usageLimitPerCustomer: z.number().int().min(1).nullable().optional(),
  firstOrderOnly: z.boolean().default(false),
  excludeDiscounted: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  active: z.boolean().default(true),
  applicableCategories: z.array(z.string().max(100)).max(50).default([]),
  excludedCategories: z.array(z.string().max(100)).max(50).default([]),
  applicableBrands: z.array(z.string().max(100)).max(50).default([]),
  excludedBrands: z.array(z.string().max(100)).max(50).default([]),
  applicableProducts: z.array(z.string().max(100)).max(100).default([]),
  customerPhones: z.array(z.string().max(30)).max(100).default([]),
}).refine(v => {
  if (v.discountType === 'percentage' && v.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue']
});

export type CouponEditInput = z.infer<typeof CouponEdit>;

export const CouponValidate = z.object({
  code: z.string().min(1).max(50).transform(v => v.toUpperCase().trim())
});
export type CouponValidateInput = z.infer<typeof CouponValidate>;

export interface CouponValidationSuccess {
  valid: true;
  coupon: {
    id: string;
    code: string;
    title: { ar: string; en: string };
    description?: { ar: string; en: string } | null;
    discountType: CouponType;
    discountValue: number;
    maxDiscountUsd?: number | null;
    freeShipping: boolean;
  };
  discountUsd: string;
  discountYer: string | null;
  totalUsd: string;
  totalYer: string | null;
  savingsText: {
    ar: string;
    en: string;
  };
}

export interface CouponValidationFailure {
  valid: false;
  code: string;
  reason:
    | 'not_found'
    | 'inactive'
    | 'not_started'
    | 'expired'
    | 'exhausted'
    | 'login_required'
    | 'customer_limit_reached'
    | 'first_order_only'
    | 'min_spend_not_met'
    | 'max_spend_exceeded'
    | 'min_qty_not_met'
    | 'no_eligible_items'
    | 'not_eligible_customer';
  message: {
    ar: string;
    en: string;
  };
  missingAmountUsd?: number;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure;

export interface CouponSummaryDto {
  id: string;
  code: string;
  title: { ar: string; en: string };
  description?: { ar: string; en: string } | null;
  discountType: CouponType;
  discountValue: number;
  maxDiscountUsd: number | null;
  minOrderAmountUsd: number | null;
  maxOrderAmountUsd: number | null;
  minItemQuantity: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  excludeDiscounted: boolean;
  isPublic: boolean;
  active: boolean;
  applicableCategories: string[];
  excludedCategories: string[];
  applicableBrands: string[];
  excludedBrands: string[];
  applicableProducts: string[];
  customerPhones: string[];
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    usages: number;
  };
}

export interface CouponUsageLogDto {
  id: string;
  couponId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  discountUsd: string;
  discountYer?: string | null;
  orderSubtotalUsd: string;
  usedAt: string;
}
