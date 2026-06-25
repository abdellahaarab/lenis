import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function splitTextIntoChars(text: string): string[] {
  return text.split('')
}

export function splitTextIntoWords(text: string): string[] {
  return text.split(' ')
}

export const easing = {
  easeOutExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeOutQuart: [0.25, 1, 0.5, 1] as [number, number, number, number],
  easeInOutCubic: [0.645, 0.045, 0.355, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 100, damping: 30 },
  springFast: { type: 'spring' as const, stiffness: 200, damping: 20 },
}
