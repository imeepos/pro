/**
 * 集成测试框架验证测试
 * 验证框架各组件是否正常工作
 */
import { BaseIntegrationTest } from './base-integration-test.js';
import { WeiboAccountStatus } from '@pro/types';

describe('集成测试框架验证', () => {
  let testInstance: FrameworkValidationTest;

  beforeAll(async () => {
    testInstance = new FrameworkValidationTest({
      // 使用最小配置进行验证
      docker: {
        enabled: false, // 跳过Docker启动，仅验证框架逻辑
        composeFile: '',
        services: []
      }
    });
    await testInstance.beforeAll();
  });

  afterAll(async () => {
    await testInstance.afterAll();
  });

  beforeEach(async () => {
    await testInstance.beforeEach();
  });

  afterEach(async () => {
    await testInstance.afterEach();
  });

  describe('数据工厂验证', () => {
    it('应该能够创建微博账号测试数据', () => {
      const account = testInstance.factory.createWeiboAccount({
        save: false,
        status: WeiboAccountStatus.ACTIVE,
        withCookies: true
      });

      expect(account).toBeDefined();
      expect(account.weiboUid).toBeDefined();
      expect(account.status).toBe(WeiboAccountStatus.ACTIVE);
      expect(account.cookies).toBeDefined();
    });

    it('应该能够创建搜索任务测试数据', () => {
      const task = testInstance.factory.createWeiboSearchTask({
        save: false,
        enabled: true,
        withLocation: true
      });

      expect(task).toBeDefined();
      expect(task.keyword).toBeDefined();
      expect(task.enabled).toBe(true);
      expect(task.longitude).toBeDefined();
      expect(task.latitude).toBeDefined();
    });

    it('应该能够创建原始数据', () => {
      const rawData = testInstance.factory.createRawWeiboData({
        text: '测试内容'
      });

      expect(rawData).toBeDefined();
      expect(rawData.id).toBeDefined();
      expect(rawData.text).toBe('测试内容');
      expect(rawData.user).toBeDefined();
    });
  });

  describe('Mock生成器验证', () => {
    it('应该能够生成微博账号Mock数据', () => {
      const mockAccount = testInstance.utils.mocks.generateWeiboAccount();

      expect(mockAccount).toBeDefined();
      expect(mockAccount.id).toBeGreaterThan(0);
      expect(mockAccount.username).toBeDefined();
      expect(mockAccount.status).toBeDefined();
    });

    it('应该能够生成API响应', () => {
      const response = testInstance.utils.mocks.generateApiResponse({
        success: true,
        data: 'test'
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true, data: 'test' });
      expect(response.headers).toBeDefined();
    });

    it('应该能够生成分页响应', () => {
      const items = [1, 2, 3, 4, 5];
      const response = testInstance.utils.mocks.generatePaginatedResponse(items, 1, 2);

      expect(response.data).toEqual([1, 2]);
      expect(response.total).toBe(5);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(2);
    });
  });

  describe('时间控制器验证', () => {
    it('应该能够冻结和解冻时间', () => {
      const beforeFreeze = new Date();

      testInstance.utils.time.freeze(beforeFreeze);
      const frozenTime = testInstance.utils.time.getCurrentTime();

      expect(frozenTime.getTime()).toBe(beforeFreeze.getTime());

      // 等待一点时间
      setTimeout(() => {
        const stillFrozen = testInstance.utils.time.getCurrentTime();
        expect(stillFrozen.getTime()).toBe(beforeFreeze.getTime());

        testInstance.utils.time.unfreeze();
        const afterUnfreeze = testInstance.utils.time.getCurrentTime();
        expect(afterUnfreeze.getTime()).toBeGreaterThan(beforeFreeze.getTime());
      }, 10);
    });

    it('应该能够时间旅行', () => {
      const targetTime = new Date('2024-01-01T00:00:00Z');

      testInstance.utils.time.travelTo(targetTime);
      const currentTime = testInstance.utils.time.getCurrentTime();

      expect(currentTime.getTime()).toBe(targetTime.getTime());

      testInstance.utils.time.reset();
    });
  });

  describe('断言扩展验证', () => {
    it('应该能够进行最终匹配断言', async () => {
      let counter = 0;
      const getValue = () => {
        counter++;
        return counter >= 3 ? 'expected' : 'unexpected';
      };

      await expect(
        testInstance.utils.assertions.eventuallyMatch(getValue, 'expected', 1000)
      ).resolves.not.toThrow();
    });

    it('应该能够进行最终存在断言', async () => {
      let value: string | null = null;

      setTimeout(() => {
        value = 'exists';
      }, 100);

      await expect(
        testInstance.utils.assertions.eventuallyExist(() => value, 1000)
      ).resolves.not.toThrow();
    });
  });

  describe('测试上下文验证', () => {
    it('应该提供完整的测试上下文', () => {
      const context = testInstance.getTestContext();

      expect(context.testId).toBeDefined();
      expect(context.startTime).toBeDefined();
      expect(context.environment).toBeDefined();
      expect(context.utils).toBeDefined();
      expect(context.database).toBeDefined();
    });

    it('应该为每个测试生成唯一的ID', () => {
      const context1 = testInstance.getTestContext();
      const context2 = testInstance.getTestContext();

      expect(context1.testId).not.toBe(context2.testId);
    });
  });
});

/**
 * 框架验证测试类
 */
class FrameworkValidationTest extends BaseIntegrationTest {
  // 重写初始化方法，跳过Docker环境启动
  protected async setupTestSuite(): Promise<void> {
    this.log('info', '开始验证集成测试框架');
  }

  protected async cleanupTestSuite(): Promise<void> {
    this.log('info', '框架验证完成');
  }
}