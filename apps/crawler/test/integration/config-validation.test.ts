/**
 * 集成测试配置验证
 * 验证Jest配置和测试环境是否正确设置
 */

describe('集成测试配置验证', () => {
  test('Jest配置应该正确加载', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.CRAWLER_TEST_MODE).toBe('integration');
  });

  test('基础集成测试环境应该可用', () => {
    // 验证基础模块是否可以正确导入
    expect(() => require('jest')).not.toThrow();
    expect(() => require('ts-jest')).not.toThrow();
  });

  test('测试环境应该支持扩展匹配器', () => {
    // 验证jest-extended是否正确加载
    expect(typeof expect().toBeEmpty).toBe('function');
  });

  test('配置文件路径应该正确', () => {
    // 验证相对路径是否正确解析
    expect(() => require('./setup')).not.toThrow();
  });
});