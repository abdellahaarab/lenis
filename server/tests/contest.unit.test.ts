import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../src/routes-contest.js';
import { can } from '@aljeel/shared';

describe('Exhibition Contest & Anti-Cheat Logic', () => {
  describe('Phone normalization & sanitization', () => {
    it('converts Arabic numerals to standard digits', () => {
      expect(normalizePhone('٠٠٩٦٧٧٧١٢٣٤٥٦٧')).toBe('+967771234567');
      expect(normalizePhone('٧٧١٢٣٤٥٦٧')).toBe('+967771234567');
    });

    it('standardizes local 9-digit Yemen numbers starting with 7', () => {
      expect(normalizePhone('771234567')).toBe('+967771234567');
      expect(normalizePhone('739876543')).toBe('+967739876543');
      expect(normalizePhone('712345678')).toBe('+967712345678');
      expect(normalizePhone('701234567')).toBe('+967701234567');
    });

    it('handles international and 00967 formats cleanly', () => {
      expect(normalizePhone('00967771234567')).toBe('+967771234567');
      expect(normalizePhone('+967 77 123 4567')).toBe('+967771234567');
      expect(normalizePhone('+966501234567')).toBe('+966501234567');
    });

    it('strips dashes, spaces, and extraneous characters', () => {
      expect(normalizePhone('77-123-4567')).toBe('+967771234567');
      expect(normalizePhone(' (771) 234 567 ')).toBe('+967771234567');
    });
  });

  describe('RBAC Contest Permissions', () => {
    it('allows owner to manage contest', () => {
      expect(can('owner', 'contest.manage')).toBe(true);
    });

    it('allows manager to manage contest', () => {
      expect(can('manager', 'contest.manage')).toBe(true);
    });

    it('allows booth sales staff to manage contest & live draws', () => {
      expect(can('sales', 'contest.manage')).toBe(true);
    });

    it('denies editor and viewer from managing contest', () => {
      expect(can('editor', 'contest.manage')).toBe(false);
      expect(can('viewer', 'contest.manage')).toBe(false);
    });
  });
});
