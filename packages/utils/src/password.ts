import type { ValidationResult } from '@pro/types';

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('密码不能为空');
  } else if (password.length < 6) {
    errors.push('密码长度必须至少为 6 位');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
