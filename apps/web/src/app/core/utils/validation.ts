export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  if (!username) return false;
  if (username.length < 3 || username.length > 20) return false;
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

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
