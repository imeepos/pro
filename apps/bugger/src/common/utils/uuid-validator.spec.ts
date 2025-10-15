import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UuidValidator } from './uuid.validator';

describe('UuidValidator', () => {
  describe('isValidUuid', () => {
    it('should return true for valid UUID v4', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(UuidValidator.isValidUuid(validUuid)).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      const invalidUuid = 'statistics';
      expect(UuidValidator.isValidUuid(invalidUuid)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(UuidValidator.isValidUuid('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(UuidValidator.isValidUuid(null as any)).toBe(false);
      expect(UuidValidator.isValidUuid(undefined as any)).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => UuidValidator.validateOrThrow(validUuid)).not.toThrow();
    });

    it('should throw BadRequestException for invalid UUID', () => {
      const invalidUuid = 'statistics';
      expect(() => UuidValidator.validateOrThrow(invalidUuid)).toThrow(BadRequestException);
    });
  });

  describe('validateWithIntelligence', () => {
    it('should not throw for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => UuidValidator.validateWithIntelligence(validUuid)).not.toThrow();
    });

    it('should throw special exception for common error values', () => {
      const commonError = 'statistics';

      try {
        UuidValidator.validateWithIntelligence(commonError, 'Bug ID');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse() as any;
        expect(response.code).toBe('ROUTE_CONFUSION');
        expect(response.suggestion).toContain('路由配置');
      }
    });

    it('should throw BadRequestException for empty values', () => {
      expect(() => UuidValidator.validateWithIntelligence('', 'Bug ID')).toThrow(BadRequestException);
    });
  });

  describe('isCommonErrorValue', () => {
    it('should return true for common error values', () => {
      expect(UuidValidator.isCommonErrorValue('statistics')).toBe(true);
      expect(UuidValidator.isCommonErrorValue('stats')).toBe(true);
      expect(UuidValidator.isCommonErrorValue('summary')).toBe(true);
    });

    it('should return false for valid UUID-like values', () => {
      expect(UuidValidator.isCommonErrorValue('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });
  });

  describe('validateMultiple', () => {
    it('should return allValid: true for all valid UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001'
      ];

      const result = UuidValidator.validateMultiple(validUuids);
      expect(result.allValid).toBe(true);
      expect(result.invalidIds).toHaveLength(0);
    });

    it('should return allValid: false and list invalid UUIDs', () => {
      const mixedUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'statistics',
        'invalid-uuid'
      ];

      const result = UuidValidator.validateMultiple(mixedUuids);
      expect(result.allValid).toBe(false);
      expect(result.invalidIds).toHaveLength(2);
      expect(result.invalidIds[0].index).toBe(1);
      expect(result.invalidIds[0].value).toBe('statistics');
    });
  });
});