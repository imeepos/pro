import { validatePassword } from './password.js';

describe('validatePassword', () => {
  it('应该拒绝空密码', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('密码不能为空');
  });

  it('应该拒绝长度小于6的密码', () => {
    const result = validatePassword('12345');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('密码长度必须至少为 6 位');
  });

  it('应该接受长度等于6的密码', () => {
    const result = validatePassword('123456');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该接受长度大于6的密码', () => {
    const result = validatePassword('12345678');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
