/**
 * Currency conversion and formatting utilities for Al-Jeel Al-Arabi.
 * Converts USD to Yemeni Rial (YER) based on active store exchange rate.
 */

export const DEFAULT_USD_TO_YER_RATE = 530;

export function calculateYer(
  usd: number | string | null | undefined,
  rate: number | string | null | undefined = DEFAULT_USD_TO_YER_RATE,
  existingYer?: number | string | null | undefined
): number | null {
  if (existingYer !== null && existingYer !== undefined && !isNaN(Number(existingYer)) && Number(existingYer) > 0) {
    return Math.round(Number(existingYer));
  }
  if (usd === null || usd === undefined || usd === '') return null;
  const numUsd = typeof usd === 'number' ? usd : parseFloat(String(usd));
  if (isNaN(numUsd) || numUsd <= 0) return null;

  const numRate = (rate !== null && rate !== undefined && !isNaN(Number(rate)) && Number(rate) > 0)
    ? Number(rate)
    : DEFAULT_USD_TO_YER_RATE;

  return Math.round(numUsd * numRate);
}

export function formatPriceYer(
  yer: number | null | undefined,
  language: string = 'ar'
): string | null {
  if (yer === null || yer === undefined || isNaN(yer) || yer <= 0) return null;
  const formatted = yer.toLocaleString(language);
  return language === 'ar' ? `(~ ${formatted} ريال)` : `(~ ${formatted} YER)`;
}
