import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { UuidValidator } from '../utils/uuid.validator';

/**
 * UUID 验证管道
 * 用于验证路由参数中的 UUID 格式
 */
@Injectable()
export class UuidValidationPipe implements PipeTransform<string> {
  private readonly fieldName: string;
  private readonly useIntelligentValidation: boolean;

  constructor(
    fieldName?: string,
    useIntelligentValidation?: boolean
  ) {
    this.fieldName = fieldName ?? 'ID';
    this.useIntelligentValidation = useIntelligentValidation ?? true;
  }

  /**
   * 转换并验证 UUID 参数
   *
   * @param value 原始值
   * @param metadata 参数元数据
   * @returns 验证后的 UUID 字符串
   * @throws BadRequestException 当 UUID 无效时
   */
  transform(value: string, metadata: ArgumentMetadata): string {
    const fieldName = metadata.data || this.fieldName;

    if (this.useIntelligentValidation) {
      // 使用智能验证，包含常见错误检测
      UuidValidator.validateWithIntelligence(value, fieldName);
    } else {
      // 使用基础验证
      UuidValidator.validateOrThrow(value, fieldName);
    }

    return value;
  }
}

/**
 * 批量 UUID 验证管道
 * 用于验证数组中的多个 UUID
 */
@Injectable()
export class UuidArrayValidationPipe implements PipeTransform<string[]> {
  constructor(
    private readonly fieldName: string = 'ID'
  ) {}

  /**
   * 转换并验证 UUID 数组
   *
   * @param values 原始值数组
   * @param metadata 参数元数据
   * @returns 验证后的 UUID 数组
   * @throws BadRequestException 当任一 UUID 无效时
   */
  transform(values: string[], metadata: ArgumentMetadata): string[] {
    const fieldName = metadata.data || this.fieldName;

    if (!Array.isArray(values)) {
      throw new BadRequestException({
        success: false,
        message: `${fieldName} 必须是数组`,
        error: `期望 ${fieldName} 为 UUID 数组`,
        code: 'INVALID_ARRAY_FORMAT',
        field: fieldName,
        value: values
      });
    }

    const validationResult = UuidValidator.validateMultiple(values, fieldName);

    if (!validationResult.allValid) {
      const errorDetails = validationResult.invalidIds
        .map(item => `索引 ${item.index}: "${item.value}" - ${item.error}`)
        .join('; ');

      throw new BadRequestException({
        success: false,
        message: `${fieldName} 数组包含无效的 UUID`,
        error: errorDetails,
        code: 'INVALID_UUID_ARRAY',
        field: fieldName,
        invalidItems: validationResult.invalidIds,
        expectedFormat: UuidValidator.getExampleUuid()
      });
    }

    return values;
  }
}

/**
 * 可选 UUID 验证管道
 * 允许空值或 undefined，但如果有值则必须是有效的 UUID
 */
@Injectable()
export class OptionalUuidValidationPipe implements PipeTransform<string> {
  constructor(
    private readonly fieldName: string = 'ID'
  ) {}

  /**
   * 转换并验证可选的 UUID 参数
   *
   * @param value 原始值
   * @param metadata 参数元数据
   * @returns 验证后的 UUID 字符串或原值（如果为空）
   */
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || value === 'undefined' || value === 'null') {
      return value;
    }

    const fieldName = metadata.data || this.fieldName;
    UuidValidator.validateWithIntelligence(value, fieldName);

    return value;
  }
}