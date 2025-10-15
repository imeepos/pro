import { BadRequestException } from '@nestjs/common';

/**
 * UUID 验证工具类
 * 提供优雅的 UUID 格式验证功能
 */
export class UuidValidator {
  /**
   * UUID v4 正则表达式
   * 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  private static readonly UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * 验证字符串是否为有效的 UUID v4
   *
   * @param id 待验证的字符串
   * @returns 是否为有效的 UUID
   */
  static isValidUuid(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    return this.UUID_V4_REGEX.test(id);
  }

  /**
   * 验证并抛出异常（如果无效）
   *
   * @param id 待验证的字符串
   * @param fieldName 字段名称，用于错误信息
   * @throws BadRequestException 当 UUID 无效时
   */
  static validateOrThrow(id: string, fieldName: string = 'ID'): void {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException({
        success: false,
        message: `无效的${fieldName}格式`,
        error: `${fieldName} 必须是有效的 UUID v4 格式，当前值: "${id}"`,
        code: 'INVALID_UUID_FORMAT',
        field: fieldName,
        value: id,
        expectedFormat: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      });
    }
  }

  /**
   * 安全验证 UUID，返回验证结果
   *
   * @param id 待验证的字符串
   * @param fieldName 字段名称
   * @returns 验证结果对象
   */
  static validateSafe(id: string, fieldName: string = 'ID'): {
    isValid: boolean;
    error?: string;
    fieldName: string;
    value: string;
  } {
    const isValid = this.isValidUuid(id);

    return {
      isValid,
      fieldName,
      value: id,
      error: isValid ? undefined : `${fieldName} 必须是有效的 UUID v4 格式，当前值: "${id}"`
    };
  }

  /**
   * 批量验证多个 UUID
   *
   * @param ids 待验证的 UUID 数组
   * @param fieldName 字段名称
   * @returns 验证结果，包含无效的 UUID 列表
   */
  static validateMultiple(ids: string[], fieldName: string = 'ID'): {
    allValid: boolean;
    invalidIds: Array<{ index: number; value: string; error: string }>;
    fieldName: string;
  } {
    const invalidIds: Array<{ index: number; value: string; error: string }> = [];

    ids.forEach((id, index) => {
      const result = this.validateSafe(id, fieldName);
      if (!result.isValid) {
        invalidIds.push({
          index,
          value: id,
          error: result.error
        });
      }
    });

    return {
      allValid: invalidIds.length === 0,
      invalidIds,
      fieldName
    };
  }

  /**
   * 生成示例 UUID 用于文档
   *
   * @returns UUID 示例
   */
  static getExampleUuid(): string {
    return '550e8400-e29b-41d4-a716-446655440000';
  }

  /**
   * 检查字符串是否像常见的错误值（如 "statistics"）
   *
   * @param id 待检查的字符串
   * @returns 是否为常见的错误值
   */
  static isCommonErrorValue(id: string): boolean {
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
      'number'
    ];

    return commonErrors.includes(id.toLowerCase());
  }

  /**
   * 智能验证：包含常见错误检测
   *
   * @param id 待验证的字符串
   * @param fieldName 字段名称
   * @throws BadRequestException 当 UUID 无效时，包含具体的错误类型
   */
  static validateWithIntelligence(id: string, fieldName: string = 'ID'): void {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException({
        success: false,
        message: `${fieldName} 不能为空`,
        error: `${fieldName} 必须是有效的 UUID v4 格式`,
        code: 'EMPTY_UUID',
        field: fieldName,
        value: id
      });
    }

    // 检查常见错误值
    if (this.isCommonErrorValue(id)) {
      throw new BadRequestException({
        success: false,
        message: `检测到常见的路由混淆：${fieldName} 不应该是 "${id}"`,
        error: `可能存在路由配置错误或前端传递了错误的参数类型。${fieldName} 应该是 UUID 格式，而不是 "${id}"`,
        code: 'ROUTE_CONFUSION',
        field: fieldName,
        value: id,
        suggestion: `请检查路由配置，确保 "${id}" 不是另一个路由的名称`,
        expectedFormat: '550e8400-e29b-41d4-a716-446655440000'
      });
    }

    this.validateOrThrow(id, fieldName);
  }
}