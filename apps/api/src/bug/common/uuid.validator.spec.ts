import { BadRequestException } from '@nestjs/common';
import { UuidValidator } from './uuid.validator';

describe('UuidValidator', () => {
  describe('isValidUuid', () => {
    it('should return true for valid UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-4000-8000-000000000000',
      ];

      validUuids.forEach(uuid => {
        expect(UuidValidator.isValidUuid(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716-44665544', // too short
        '550e8400-e29b-41d4-a716-4466554400000', // too long
        '550e8400e29b41d4a716446655440000', // missing dashes
        '550e8400-e29b-41d4-a716-44665544zzzz', // invalid characters
        '550e8400-e29b-41d4-a716-446655440001', // invalid version (1 instead of 4)
        '550e8400-e29b-51d4-a716-446655440000', // invalid variant (5)
        '', // empty string
        ' ', // space only
        null as any,
        undefined as any,
        123 as any,
        {} as any,
      ];

      invalidUuids.forEach(uuid => {
        expect(UuidValidator.isValidUuid(uuid)).toBe(false);
      });
    });

    it('should handle case insensitive UUIDs', () => {
      const uppercaseUuid = '550E8400-E29B-41D4-A716-446655440000';
      const mixedCaseUuid = '550e8400-E29b-41d4-A716-446655440000';

      expect(UuidValidator.isValidUuid(uppercaseUuid)).toBe(true);
      expect(UuidValidator.isValidUuid(mixedCaseUuid)).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      expect(() => {
        UuidValidator.validateOrThrow(validUuid);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid UUID', () => {
      const invalidUuid = 'not-a-uuid';

      expect(() => {
        UuidValidator.validateOrThrow(invalidUuid);
      }).toThrow(BadRequestException);
    });

    it('should throw with correct error structure', () => {
      const invalidUuid = 'invalid-uuid';
      const fieldName = 'Test ID';

      try {
        UuidValidator.validateOrThrow(invalidUuid, fieldName);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual({
          success: false,
          message: `无效的${fieldName}格式`,
          error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: "${invalidUuid}"`,
          code: 'INVALID_UUID_FORMAT',
          field: fieldName,
          value: invalidUuid,
          expectedFormat: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        });
      }
    });

    it('should use default field name when not provided', () => {
      const invalidUuid = 'invalid-uuid';

      try {
        UuidValidator.validateOrThrow(invalidUuid);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error.response.field).toBe('ID');
        expect(error.response.message).toBe('无效的ID格式');
      }
    });

    it('should handle empty string', () => {
      expect(() => {
        UuidValidator.validateOrThrow('');
      }).toThrow(BadRequestException);
    });

    it('should handle null and undefined', () => {
      expect(() => {
        UuidValidator.validateOrThrow(null as any);
      }).toThrow(BadRequestException);

      expect(() => {
        UuidValidator.validateOrThrow(undefined as any);
      }).toThrow(BadRequestException);
    });
  });

  describe('validateSafe', () => {
    it('should return valid result for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const fieldName = 'User ID';

      const result = UuidValidator.validateSafe(validUuid, fieldName);

      expect(result).toEqual({
        isValid: true,
        fieldName,
        value: validUuid,
        error: undefined,
      });
    });

    it('should return invalid result for invalid UUID', () => {
      const invalidUuid = 'not-a-uuid';
      const fieldName = 'User ID';

      const result = UuidValidator.validateSafe(invalidUuid, fieldName);

      expect(result).toEqual({
        isValid: false,
        fieldName,
        value: invalidUuid,
        error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: "${invalidUuid}"`,
      });
    });

    it('should use default field name when not provided', () => {
      const invalidUuid = 'invalid-uuid';

      const result = UuidValidator.validateSafe(invalidUuid);

      expect(result.fieldName).toBe('ID');
      expect(result.error).toContain('ID 必须是有效的 UUID v4 格式');
    });

    it('should handle edge cases', () => {
      const testCases = [
        { input: '', expected: false },
        { input: ' ', expected: false },
        { input: null as any, expected: false },
        { input: undefined as any, expected: false },
        { input: 123 as any, expected: false },
        { input: {} as any, expected: false },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = UuidValidator.validateSafe(input);
        expect(result.isValid).toBe(expected);
      });
    });
  });

  describe('validateMultiple', () => {
    it('should return all valid for all valid UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '123e4567-e89b-12d3-a456-426614174000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];
      const fieldName = 'Test IDs';

      const result = UuidValidator.validateMultiple(validUuids, fieldName);

      expect(result).toEqual({
        allValid: true,
        invalidIds: [],
        fieldName,
      });
    });

    it('should return invalid entries for mixed UUIDs', () => {
      const mixedUuids = [
        '550e8400-e29b-41d4-a716-446655440000', // valid
        'invalid-uuid', // invalid
        '123e4567-e89b-12d3-a456-426614174000', // valid
        'not-a-uuid', // invalid
        '', // invalid
      ];
      const fieldName = 'Mixed IDs';

      const result = UuidValidator.validateMultiple(mixedUuids, fieldName);

      expect(result.allValid).toBe(false);
      expect(result.invalidIds).toHaveLength(3);
      expect(result.fieldName).toBe(fieldName);

      // Check invalid entries
      expect(result.invalidIds[0]).toEqual({
        index: 1,
        value: 'invalid-uuid',
        error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: "invalid-uuid"`,
      });
      expect(result.invalidIds[1]).toEqual({
        index: 3,
        value: 'not-a-uuid',
        error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: "not-a-uuid"`,
      });
      expect(result.invalidIds[2]).toEqual({
        index: 4,
        value: '',
        error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: ""`,
      });
    });

    it('should handle empty array', () => {
      const result = UuidValidator.validateMultiple([], 'Test IDs');

      expect(result).toEqual({
        allValid: true,
        invalidIds: [],
        fieldName: 'Test IDs',
      });
    });

    it('should use default field name when not provided', () => {
      const invalidUuids = ['invalid-uuid'];

      const result = UuidValidator.validateMultiple(invalidUuids);

      expect(result.fieldName).toBe('ID');
      expect(result.invalidIds[0].error).toContain('ID 必须是有效的 UUID v4 格式');
    });

    it('should handle all invalid UUIDs', () => {
      const invalidUuids = ['invalid1', 'invalid2', 'invalid3'];

      const result = UuidValidator.validateMultiple(invalidUuids, 'Invalid IDs');

      expect(result.allValid).toBe(false);
      expect(result.invalidIds).toHaveLength(3);
      expect(result.invalidIds[0].index).toBe(0);
      expect(result.invalidIds[1].index).toBe(1);
      expect(result.invalidIds[2].index).toBe(2);
    });
  });

  describe('getExampleUuid', () => {
    it('should return a valid UUID example', () => {
      const example = UuidValidator.getExampleUuid();

      expect(example).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(UuidValidator.isValidUuid(example)).toBe(true);
    });

    it('should return consistent example', () => {
      const example1 = UuidValidator.getExampleUuid();
      const example2 = UuidValidator.getExampleUuid();

      expect(example1).toBe(example2);
    });
  });

  describe('isCommonErrorValue', () => {
    it('should return true for common error values', () => {
      const commonErrors = [
        'statistics',
        'stats',
        'summary',
        'report',
        'data',
        'info',
        'list',
        'all',
        'undefined',
        'null',
        'string',
        'number',
        'STATISTICS', // uppercase
        'Statistics', // capitalized
        '   data   ', // with spaces should be false
      ];

      commonErrors.forEach(value => {
        expect(UuidValidator.isCommonErrorValue(value)).toBe(true);
      });
    });

    it('should return false for valid UUID-like values', () => {
      const validValues = [
        '550e8400-e29b-41d4-a716-446655440000',
        'user-123',
        'id-456',
        'uuid-789',
        'valid-uuid-format',
      ];

      validValues.forEach(value => {
        expect(UuidValidator.isCommonErrorValue(value)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(UuidValidator.isCommonErrorValue('')).toBe(false);
      expect(UuidValidator.isCommonErrorValue(' ')).toBe(false);
      expect(UuidValidator.isCommonErrorValue(null as any)).toBe(false);
      expect(UuidValidator.isCommonErrorValue(undefined as any)).toBe(false);
      expect(UuidValidator.isCommonErrorValue(123 as any)).toBe(false);
    });
  });

  describe('validateWithIntelligence', () => {
    it('should not throw for valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      expect(() => {
        UuidValidator.validateWithIntelligence(validUuid);
      }).not.toThrow();
    });

    it('should throw for empty or null values', () => {
      const testCases = [
        { input: '', expectedMessage: 'ID 不能为空' },
        { input: null as any, expectedMessage: 'ID 不能为空' },
        { input: undefined as any, expectedMessage: 'ID 不能为空' },
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        try {
          UuidValidator.validateWithIntelligence(input);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.response.message).toBe(expectedMessage);
          expect(error.response.code).toBe('EMPTY_UUID');
        }
      });
    });

    it('should throw for common error values with route confusion detection', () => {
      const commonErrors = [
        'statistics',
        'stats',
        'summary',
        'report',
        'data',
        'info',
        'list',
        'all',
        'undefined',
        'null',
        'string',
        'number',
      ];
      const fieldName = 'Bug ID';

      commonErrors.forEach(errorValue => {
        try {
          UuidValidator.validateWithIntelligence(errorValue, fieldName);
          fail(`Should have thrown BadRequestException for "${errorValue}"`);
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.response.code).toBe('ROUTE_CONFUSION');
          expect(error.response.message).toBe(`检测到常见的路由混淆：${fieldName} 不应该是 "${errorValue}"`);
          expect(error.response.error).toContain('可能存在路由配置错误');
          expect(error.response.suggestion).toContain('请检查路由配置');
        }
      });
    });

    it('should throw for invalid UUID format', () => {
      const invalidUuid = 'invalid-uuid-format';
      const fieldName = 'User ID';

      try {
        UuidValidator.validateWithIntelligence(invalidUuid, fieldName);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.code).toBe('INVALID_UUID_FORMAT');
        expect(error.response.message).toBe(`无效的${fieldName}格式`);
        expect(error.response.field).toBe(fieldName);
        expect(error.response.value).toBe(invalidUuid);
      }
    });

    it('should use default field name when not provided', () => {
      const invalidUuid = 'invalid-uuid';

      try {
        UuidValidator.validateWithIntelligence(invalidUuid);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error.response.field).toBe('ID');
        expect(error.response.message).toBe('无效的ID格式');
      }
    });

    it('should handle case insensitive common errors', () => {
      const caseInsensitiveErrors = ['STATISTICS', 'Stats', 'DATA', 'info'];

      caseInsensitiveErrors.forEach(errorValue => {
        try {
          UuidValidator.validateWithIntelligence(errorValue);
          fail(`Should have thrown BadRequestException for "${errorValue}"`);
        } catch (error) {
          expect(error.response.code).toBe('ROUTE_CONFUSION');
        }
      });
    });

    it('should provide comprehensive error information for route confusion', () => {
      const errorValue = 'statistics';
      const fieldName = 'Project ID';

      try {
        UuidValidator.validateWithIntelligence(errorValue, fieldName);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error.response).toEqual({
          success: false,
          message: `检测到常见的路由混淆：${fieldName} 不应该是 "${errorValue}"`,
          error: `可能存在路由配置错误或前端传递了错误的参数类型。${fieldName} 应该是 UUID 格式，而不是 "${errorValue}"`,
          code: 'ROUTE_CONFUSION',
          field: fieldName,
          value: errorValue,
          suggestion: `请检查路由配置，确保 "${errorValue}" 不是另一个路由的名称`,
          expectedFormat: '550e8400-e29b-41d4-a716-446655440000'
        });
      }
    });

    it('should handle non-string types', () => {
      const nonStringValues = [123, {}, [], true, false];

      nonStringValues.forEach(value => {
        try {
          UuidValidator.validateWithIntelligence(value as any);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error.response.code).toBe('EMPTY_UUID');
          expect(error.response.message).toContain('不能为空');
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with validation flow', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUuid = 'statistics';
      const fieldName = 'Test ID';

      // Test valid UUID flow
      expect(UuidValidator.isValidUuid(validUuid)).toBe(true);

      const safeResult = UuidValidator.validateSafe(validUuid, fieldName);
      expect(safeResult.isValid).toBe(true);
      expect(safeResult.error).toBeUndefined();

      expect(() => {
        UuidValidator.validateOrThrow(validUuid, fieldName);
      }).not.toThrow();

      expect(() => {
        UuidValidator.validateWithIntelligence(validUuid, fieldName);
      }).not.toThrow();

      // Test invalid UUID flow
      expect(UuidValidator.isValidUuid(invalidUuid)).toBe(false);
      expect(UuidValidator.isCommonErrorValue(invalidUuid)).toBe(true);

      const invalidSafeResult = UuidValidator.validateSafe(invalidUuid, fieldName);
      expect(invalidSafeResult.isValid).toBe(false);
      expect(invalidSafeResult.error).toBeDefined();

      expect(() => {
        UuidValidator.validateOrThrow(invalidUuid, fieldName);
      }).toThrow(BadRequestException);

      expect(() => {
        UuidValidator.validateWithIntelligence(invalidUuid, fieldName);
      }).toThrow(BadRequestException);
    });

    it('should handle batch validation correctly', () => {
      const mixedUuids = [
        '550e8400-e29b-41d4-a716-446655440000', // valid
        'statistics', // common error
        'invalid-uuid', // invalid format
        '123e4567-e89b-12d3-a456-426614174000', // valid
        '', // empty
      ];

      const result = UuidValidator.validateMultiple(mixedUuids, 'Batch Test');

      expect(result.allValid).toBe(false);
      expect(result.invalidIds).toHaveLength(3);
      expect(result.invalidIds[0].value).toBe('statistics');
      expect(result.invalidIds[1].value).toBe('invalid-uuid');
      expect(result.invalidIds[2].value).toBe('');
    });
  });
});