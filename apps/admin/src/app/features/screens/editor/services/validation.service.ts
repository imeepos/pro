import { Injectable } from '@angular/core';
import { FormMetadata, ValidationRule, ValidationResult, ValidationType } from '../models/form-metadata.model';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() {}

  /**
   * 验证表单字段值
   */
  validateValue(value: any, metadata: FormMetadata): ValidationResult {
    if (!metadata.validationRules || metadata.validationRules.length === 0) {
      return { status: 'valid', isValid: true };
    }

    for (const rule of metadata.validationRules) {
      const result = this.validateRule(value, rule);
      if (!result.isValid) {
        return result;
      }
    }

    return { status: 'valid', isValid: true };
  }

  /**
   * 验证单个规则
   */
  private validateRule(value: any, rule: ValidationRule): ValidationResult {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule.message);

      case 'min':
        return this.validateMin(value, rule.value, rule.message);

      case 'max':
        return this.validateMax(value, rule.value, rule.message);

      case 'minLength':
        return this.validateMinLength(value, rule.value, rule.message);

      case 'maxLength':
        return this.validateMaxLength(value, rule.value, rule.message);

      case 'pattern':
        return this.validatePattern(value, rule.value, rule.message);

      case 'email':
        return this.validateEmail(value, rule.message);

      case 'url':
        return this.validateUrl(value, rule.message);

      case 'color':
        return this.validateColor(value, rule.message);

      case 'range':
        return this.validateRange(value, rule.value, rule.message);

      default:
        return { status: 'valid', isValid: true };
    }
  }

  /**
   * 验证必填字段
   */
  private validateRequired(value: any, message: string): ValidationResult {
    const isEmpty = value === null ||
                   value === undefined ||
                   value === '' ||
                   (Array.isArray(value) && value.length === 0);

    return {
      status: isEmpty ? 'invalid' : 'valid',
      isValid: !isEmpty,
      message: isEmpty ? message : undefined
    };
  }

  /**
   * 验证最小值
   */
  private validateMin(value: any, min: number, message: string): ValidationResult {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        status: 'invalid',
        isValid: false,
        message: '请输入有效的数字'
      };
    }

    const isValid = numValue >= min;
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证最大值
   */
  private validateMax(value: any, max: number, message: string): ValidationResult {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        status: 'invalid',
        isValid: false,
        message: '请输入有效的数字'
      };
    }

    const isValid = numValue <= max;
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证最小长度
   */
  private validateMinLength(value: any, minLength: number, message: string): ValidationResult {
    const stringValue = String(value || '');
    const isValid = stringValue.length >= minLength;
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证最大长度
   */
  private validateMaxLength(value: any, maxLength: number, message: string): ValidationResult {
    const stringValue = String(value || '');
    const isValid = stringValue.length <= maxLength;
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证正则表达式
   */
  private validatePattern(value: any, pattern: string, message: string): ValidationResult {
    const stringValue = String(value || '');
    const regex = new RegExp(pattern);
    const isValid = regex.test(stringValue);
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证邮箱格式
   */
  private validateEmail(value: any, message: string): ValidationResult {
    const stringValue = String(value || '').trim();
    if (!stringValue) {
      return { status: 'valid', isValid: true }; // 空值由required规则处理
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(stringValue);
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证URL格式
   */
  private validateUrl(value: any, message: string): ValidationResult {
    const stringValue = String(value || '').trim();
    if (!stringValue) {
      return { status: 'valid', isValid: true }; // 空值由required规则处理
    }

    try {
      new URL(stringValue);
      return { status: 'valid', isValid: true };
    } catch {
      return {
        status: 'invalid',
        isValid: false,
        message
      };
    }
  }

  /**
   * 验证颜色格式
   */
  private validateColor(value: any, message: string): ValidationResult {
    const stringValue = String(value || '').trim();
    if (!stringValue) {
      return { status: 'valid', isValid: true }; // 空值由required规则处理
    }

    // 支持 #RRGGBB, #RGB, rgb(), rgba(), hsl(), hsla() 格式
    const colorRegex = /^(#([0-9a-fA-F]{3}){1,2}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\))$/;
    const isValid = colorRegex.test(stringValue);
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证数值范围
   */
  private validateRange(value: any, range: { min: number; max: number }, message: string): ValidationResult {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        status: 'invalid',
        isValid: false,
        message: '请输入有效的数字'
      };
    }

    const isValid = numValue >= range.min && numValue <= range.max;
    return {
      status: isValid ? 'valid' : 'invalid',
      isValid,
      message: isValid ? undefined : message
    };
  }

  /**
   * 验证整个表单对象
   */
  validateForm(formData: any, config: FormMetadata[]): { [key: string]: ValidationResult } {
    const results: { [key: string]: ValidationResult } = {};

    const validateField = (metadata: FormMetadata, prefix: string = '') => {
      if (metadata.type === 'group' && metadata.children) {
        metadata.children.forEach(child => validateField(child, prefix));
        return;
      }

      const key = Array.isArray(metadata.key) ? metadata.key.join('.') : metadata.key;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const fieldValue = this.getNestedValue(formData, fullKey);

      results[fullKey] = this.validateValue(fieldValue, metadata);
    };

    config.forEach(metadata => validateField(metadata));

    return results;
  }

  /**
   * 检查表单是否全部验证通过
   */
  isFormValid(validationResults: { [key: string]: ValidationResult }): boolean {
    return Object.values(validationResults).every(result => result.isValid);
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  /**
   * 创建常用验证规则
   */
  static createRules = {
    required: (message: string = '此字段为必填项'): ValidationRule => ({
      type: 'required',
      message
    }),

    min: (min: number, message?: string): ValidationRule => ({
      type: 'min',
      value: min,
      message: message || `值不能小于 ${min}`
    }),

    max: (max: number, message?: string): ValidationRule => ({
      type: 'max',
      value: max,
      message: message || `值不能大于 ${max}`
    }),

    range: (min: number, max: number, message?: string): ValidationRule => ({
      type: 'range',
      value: { min, max },
      message: message || `值必须在 ${min} 到 ${max} 之间`
    }),

    email: (message: string = '请输入有效的邮箱地址'): ValidationRule => ({
      type: 'email',
      message
    }),

    url: (message: string = '请输入有效的URL地址'): ValidationRule => ({
      type: 'url',
      message
    }),

    color: (message: string = '请输入有效的颜色值'): ValidationRule => ({
      type: 'color',
      message
    }),

    pattern: (pattern: string, message: string): ValidationRule => ({
      type: 'pattern',
      value: pattern,
      message
    }),

    minLength: (minLength: number, message?: string): ValidationRule => ({
      type: 'minLength',
      value: minLength,
      message: message || `长度不能少于 ${minLength} 个字符`
    }),

    maxLength: (maxLength: number, message?: string): ValidationRule => ({
      type: 'maxLength',
      value: maxLength,
      message: message || `长度不能超过 ${maxLength} 个字符`
    })
  };
}