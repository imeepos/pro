/**
 * API性能和并发集成测试艺术品
 *
 * 这个测试集验证系统在高并发和负载情况下的性能表现
 * 每个测试都是对系统性能边界和稳定性的深刻检验
 */

import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from '../factories/data.factory';

/**
 * 性能测试指标接口
 */
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  requestCount: number;
  errorCount: number;
  successRate: number;
}

/**
 * 并发测试结果接口
 */
interface ConcurrencyTestResult {
  totalTime: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorCount: number;
  successRate: number;
  memoryUsage: NodeJS.MemoryUsage;
}

/**
 * API性能测试类
 * 继承自集成测试基类，专注于性能和并发测试
 */
class ApiPerformanceIntegrationTest extends WeiboIntegrationTestBase {
  private performanceMetrics: PerformanceMetrics[] = [];

  /**
   * 执行性能测试并收集指标
   */
  async executePerformanceTest(
    testFunction: () => Promise<any>,
    iterations: number = 10
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    let requestCount = 0;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        await testFunction();
        requestCount++;
      } catch (error) {
        errorCount++;
        console.warn(`性能测试第 ${i + 1} 次迭代失败:`, error);
      }
    }

    const endTime = Date.now();
    const finalMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      responseTime: endTime - startTime,
      memoryUsage: finalMemory,
      requestCount,
      errorCount,
      successRate: requestCount / iterations
    };

    this.performanceMetrics.push(metrics);
    return metrics;
  }

  /**
   * 执行并发测试
   */
  async executeConcurrencyTest(
    testFunction: () => Promise<any>,
    concurrency: number,
    iterations: number = concurrency
  ): Promise<ConcurrencyTestResult> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    const responseTimes: number[] = [];
    let errorCount = 0;

    const promises = Array.from({ length: concurrency }, async (_, index) => {
      const requestStartTime = Date.now();
      try {
        await testFunction();
        const responseTime = Date.now() - requestStartTime;
        responseTimes.push(responseTime);
      } catch (error) {
        errorCount++;
        console.warn(`并发测试请求 ${index + 1} 失败:`, error);
      }
    });

    await Promise.all(promises);

    const endTime = Date.now();
    const finalMemory = process.memoryUsage();

    const totalTime = endTime - startTime;
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const requestsPerSecond = (iterations / totalTime) * 1000;
    const successRate = (iterations - errorCount) / iterations;

    return {
      totalTime,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorCount,
      successRate,
      memoryUsage: finalMemory
    };
  }

  /**
   * 测试内存泄漏
   */
  async testMemoryLeak(testFunction: () => Promise<any>, cycles: number = 5): Promise<boolean> {
    const memorySnapshots: NodeJS.MemoryUsage[] = [];

    for (let cycle = 0; cycle < cycles; cycle++) {
      // 执行多次测试操作
      for (let i = 0; i < 20; i++) {
        try {
          await testFunction();
        } catch (error) {
          // 忽略单个错误，专注于内存使用
        }
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      // 记录内存使用情况
      memorySnapshots.push(process.memoryUsage());

      // 等待一段时间让内存稳定
      await this.waitAsync(1000);
    }

    // 分析内存增长趋势
    const heapUsedValues = memorySnapshots.map(snapshot => snapshot.heapUsed);
    const initialHeap = heapUsedValues[0];
    const finalHeap = heapUsedValues[heapUsedValues.length - 1];
    const memoryGrowth = finalHeap - initialHeap;
    const growthPercentage = (memoryGrowth / initialHeap) * 100;

    console.log(`内存使用分析: 初始 ${(initialHeap / 1024 / 1024).toFixed(2)}MB, ` +
                `最终 ${(finalHeap / 1024 / 1024).toFixed(2)}MB, ` +
                `增长 ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB (${growthPercentage.toFixed(2)}%)`);

    // 如果内存增长超过50%，认为可能存在内存泄漏
    return growthPercentage < 50;
  }

  /**
   * 清理性能测试数据
   */
  cleanupPerformanceData(): void {
    this.performanceMetrics = [];
  }
}

describe('API性能和并发集成测试', () => {
  let test: ApiPerformanceIntegrationTest;

  beforeAll(async () => {
    test = new ApiPerformanceIntegrationTest();
    await test.setupEnvironment();
    await test.createAndAuthenticateUser();
  });

  afterAll(async () => {
    test.cleanupPerformanceData();
    await test.cleanupEnvironment();
  });

  describe('基础性能测试', () => {
    it('微博账号查询应该在合理时间内完成', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
                weiboNickname
              }
            }
            totalCount
          }
        }
      `;

      const metrics = await test.executePerformanceTest(async () => {
        await test.executeQuery(query, {
          filter: { page: 1, pageSize: 10 }
        });
      }, 20);

      expect(metrics.successRate).toBeGreaterThan(0.9); // 90%成功率
      expect(metrics.responseTime / metrics.requestCount).toBeLessThan(500); // 平均响应时间小于500ms
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 堆内存小于500MB
    });

    it('搜索任务查询应该在合理时间内完成', async () => {
      const query = `
        query WeiboSearchTasks($filter: QueryTaskDto) {
          weiboSearchTasks(filter: $filter) {
            edges {
              node {
                id
                keyword
                status
                enabled
              }
            }
            totalCount
          }
        }
      `;

      const metrics = await test.executePerformanceTest(async () => {
        await test.executeQuery(query, {
          filter: { page: 1, limit: 10 }
        });
      }, 20);

      expect(metrics.successRate).toBeGreaterThan(0.9);
      expect(metrics.responseTime / metrics.requestCount).toBeLessThan(500);
    });

    it('原始数据查询应该在合理时间内完成', async () => {
      const query = `
        query RawDataList($filter: RawDataFilterDto) {
          rawDataList(filter: $filter) {
            items {
              id
              sourceType
              title
            }
            total
          }
        }
      `;

      const metrics = await test.executePerformanceTest(async () => {
        await test.executeQuery(query, {
          filter: { page: 1, pageSize: 10 }
        });
      }, 20);

      expect(metrics.successRate).toBeGreaterThan(0.9);
      expect(metrics.responseTime / metrics.requestCount).toBeLessThan(1000); // 数据查询可能稍慢
    });

    it('用户认证操作应该快速完成', async () => {
      const userData = TestDataFactory.user.createRegistrationData();

      const registerMetrics = await test.executePerformanceTest(async () => {
        await test.registerUser(userData);
      }, 5); // 注册测试次数较少

      expect(registerMetrics.successRate).toBeGreaterThan(0.8);
      expect(registerMetrics.responseTime / registerMetrics.requestCount).toBeLessThan(2000); // 注册允许2秒内
    });
  });

  describe('并发性能测试', () => {
    it('应该能够处理中等并发查询请求', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
              }
            }
            totalCount
          }
        }
      `;

      const result = await test.executeConcurrencyTest(
        () => test.executeQuery(query, {
          filter: { page: 1, pageSize: 5 }
        }),
        20, // 20个并发请求
        20
      );

      expect(result.successRate).toBeGreaterThan(0.8); // 80%成功率
      expect(result.averageResponseTime).toBeLessThan(2000); // 平均响应时间小于2秒
      expect(result.requestsPerSecond).toBeGreaterThan(5); // 每秒至少处理5个请求
      expect(result.maxResponseTime).toBeLessThan(5000); // 最大响应时间小于5秒
    });

    it('应该能够处理高并发读取操作', async () => {
      const statsQuery = `
        query WeiboAccountStats {
          weiboAccountStats {
            total
            online
          }
        }
      `;

      const result = await test.executeConcurrencyTest(
        () => test.executeQuery(statsQuery),
        50, // 50个并发请求
        50
      );

      expect(result.successRate).toBeGreaterThan(0.7); // 高并发下成功率可能降低
      expect(result.averageResponseTime).toBeLessThan(3000);
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    });

    it('应该能够处理并发搜索请求', async () => {
      const searchQuery = `
        query SearchRawData($keyword: String!) {
          searchRawData(keyword: $keyword, page: 1, pageSize: 10) {
            items {
              id
              title
            }
            total
          }
        }
      `;

      const keywords = ['test', 'data', 'search', 'query', 'api'];
      const results = await Promise.all(
        keywords.map(keyword =>
          test.executeConcurrencyTest(
            () => test.executeQuery(searchQuery, { keyword }),
            10, // 每个关键词10个并发
            10
          )
        )
      );

      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(0.6);
        expect(result.averageResponseTime).toBeLessThan(5000);
        console.log(`关键词 "${keywords[index]}" 性能:`, {
          平均响应时间: `${result.averageResponseTime}ms`,
          成功率: `${(result.successRate * 100).toFixed(1)}%`,
          每秒请求数: result.requestsPerSecond.toFixed(1)
        });
      });
    });

    it('应该能够处理并发认证请求', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      await test.registerUser(userData);

      const loginData = TestDataFactory.user.createLoginData(userData);

      const loginMutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
            accessToken
          }
        }
      `;

      const result = await test.executeConcurrencyTest(
        () => test.client.mutate(loginMutation, { input: loginData }),
        10, // 10个并发登录请求
        10
      );

      expect(result.successRate).toBeGreaterThan(0.5); // 认证可能有限流
      expect(result.averageResponseTime).toBeLessThan(5000);
    });
  });

  describe('负载测试', () => {
    it('应该能够处理持续负载', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
              }
            }
            totalCount
          }
        }
      `;

      const startTime = Date.now();
      const duration = 30000; // 30秒持续负载
      let requestCount = 0;
      let errorCount = 0;

      while (Date.now() - startTime < duration) {
        const promises = Array.from({ length: 5 }, async () => {
          try {
            await test.executeQuery(query, {
              filter: { page: 1, pageSize: 10 }
            });
            requestCount++;
          } catch (error) {
            errorCount++;
          }
        });

        await Promise.all(promises);
        await test.waitAsync(100); // 每100ms发送5个请求
      }

      const totalTime = Date.now() - startTime;
      const successRate = requestCount / (requestCount + errorCount);
      const requestsPerSecond = (requestCount / totalTime) * 1000;

      expect(successRate).toBeGreaterThan(0.8);
      expect(requestsPerSecond).toBeGreaterThan(20);
      expect(requestCount).toBeGreaterThan(100);

      console.log(`持续负载测试结果: ${requestCount}个请求, ` +
                  `${(successRate * 100).toFixed(1)}%成功率, ` +
                  `${requestsPerSecond.toFixed(1)} RPS`);
    });

    it('应该能够处理混合工作负载', async () => {
      const queries = [
        // 账号查询
        () => test.executeQuery(`
          query WeiboAccounts {
            weiboAccounts(filter: { page: 1, pageSize: 5 }) {
              edges { node { id } }
              totalCount
            }
          }
        `),
        // 任务查询
        () => test.executeQuery(`
          query WeiboSearchTasks {
            weiboSearchTasks(filter: { page: 1, limit: 5 }) {
              edges { node { id } }
              totalCount
            }
          }
        `),
        // 统计查询
        () => test.executeQuery(`
          query WeiboAccountStats {
            weiboAccountStats { total online }
          }
        `),
        // 搜索查询
        () => test.executeQuery(`
          query SearchRawData {
            searchRawData(keyword: "test", page: 1, pageSize: 5) {
              items { id }
              total
            }
          }
        `)
      ];

      const results = await Promise.all(
        queries.map((queryFn, index) =>
          test.executeConcurrencyTest(queryFn, 15, 15)
        )
      );

      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(0.7);
        expect(result.averageResponseTime).toBeLessThan(3000);

        const queryNames = ['账号查询', '任务查询', '统计查询', '搜索查询'];
        console.log(`${queryNames[index]} 性能:`, {
          平均响应时间: `${result.averageResponseTime}ms`,
          成功率: `${(result.successRate * 100).toFixed(1)}%`,
          每秒请求数: result.requestsPerSecond.toFixed(1)
        });
      });
    });
  });

  describe('内存管理测试', () => {
    it('不应该存在明显的内存泄漏', async () => {
      const query = `
        query WeiboAccounts {
          weiboAccounts(filter: { page: 1, pageSize: 20 }) {
            edges { node { id weiboUid weiboNickname } }
            totalCount
          }
        }
      `;

      const noLeakDetected = await test.testMemoryLeak(
        () => test.executeQuery(query),
        3 // 3个测试周期
      );

      expect(noLeakDetected).toBe(true);
    });

    it('高并发情况下内存使用应该稳定', async () => {
      const query = `
        query RawDataList {
          rawDataList(filter: { page: 1, pageSize: 50 }) {
            items { id sourceType title }
            total
          }
        }
      `;

      const initialMemory = process.memoryUsage();
      console.log('初始内存使用:', {
        堆内存: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        外部内存: `${(initialMemory.external / 1024 / 1024).toFixed(2)}MB`
      });

      // 执行多轮高并发测试
      for (let round = 0; round < 3; round++) {
        await test.executeConcurrencyTest(
          () => test.executeQuery(query),
          20,
          20
        );

        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }

        await test.waitAsync(2000);

        const currentMemory = process.memoryUsage();
        console.log(`第 ${round + 1} 轮后内存使用:`, {
          堆内存: `${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          外部内存: `${(currentMemory.external / 1024 / 1024).toFixed(2)}MB`
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const growthPercentage = (memoryGrowth / initialMemory.heapUsed) * 100;

      expect(growthPercentage).toBeLessThan(100); // 内存增长不超过100%
    });
  });

  describe('连接池和资源管理测试', () => {
    it('数据库连接池应该有效管理', async () => {
      const query = `
        query WeiboAccounts {
          weiboAccounts(filter: { page: 1, pageSize: 100 }) {
            edges { node { id weiboUid weiboNickname status createdAt updatedAt } }
            totalCount
          }
        }
      `;

      // 执行大量并发请求测试连接池
      const result = await test.executeConcurrencyTest(
        () => test.executeQuery(query),
        30, // 30个并发请求
        30
      );

      expect(result.successRate).toBeGreaterThan(0.8);
      expect(result.averageResponseTime).toBeLessThan(3000);

      // 如果连接池配置正确，不应该出现连接超时或连接耗尽的错误
      expect(result.errorCount).toBeLessThan(5); // 允许少量错误
    });

    it('应该能够优雅处理资源耗尽情况', async () => {
      const complexQuery = `
        query ComplexSearch {
          weiboAccounts(filter: { page: 1, pageSize: 100 }) {
            edges { node { id weiboUid weiboNickname status lastCheckAt createdAt updatedAt } }
            totalCount
          }
          weiboSearchTasks(filter: { page: 1, limit: 100 }) {
            edges { node { id keyword status enabled startDate crawlInterval } }
            totalCount
          }
          rawDataList(filter: { page: 1, pageSize: 100 }) {
            items { id sourceType title content author publishTime crawlTime }
            total
          }
          weiboAccountStats { total todayNew online }
        }
      `;

      // 发送大量复杂查询来测试资源管理
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () =>
          test.executeQuery(complexQuery)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const successRate = successful / results.length;
      expect(successRate).toBeGreaterThan(0.5); // 在资源压力下仍应有50%成功率

      console.log(`资源耗尽测试: ${successful} 成功, ${failed} 失败, 成功率 ${(successRate * 100).toFixed(1)}%`);
    });
  });

  describe('性能退化检测', () => {
    it('应该检测响应时间退化', async () => {
      const query = `
        query WeiboAccounts {
          weiboAccounts(filter: { page: 1, pageSize: 50 }) {
            edges { node { id weiboUid } }
            totalCount
          }
        }
      `;

      const responseTimes: number[] = [];

      // 执行多轮测试收集响应时间
      for (let round = 0; round < 5; round++) {
        const startTime = Date.now();
        await test.executeQuery(query);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        await test.waitAsync(500);
      }

      // 计算响应时间趋势
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      console.log(`响应时间分析: 前半段平均 ${firstHalfAvg.toFixed(0)}ms, ` +
                  `后半段平均 ${secondHalfAvg.toFixed(0)}ms, ` +
                  `退化 ${degradation.toFixed(1)}%`);

      // 性能退化不应超过50%
      expect(degradation).toBeLessThan(50);
      expect(secondHalfAvg).toBeLessThan(2000); // 后半段仍应在2秒内
    });

    it('应该检测吞吐量退化', async () => {
      const query = `
        query SimpleStats {
          weiboAccountStats { total }
        }
      `;

      const throughputTests = await Promise.all([
        test.executeConcurrencyTest(() => test.executeQuery(query), 10, 10),
        test.executeConcurrencyTest(() => test.executeQuery(query), 10, 10),
        test.executeConcurrencyTest(() => test.executeQuery(query), 10, 10)
      ]);

      const throughputs = throughputTests.map(test => test.requestsPerSecond);
      const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;

      console.log(`吞吐量测试: ${throughputs.map(t => t.toFixed(1)).join(', ')} RPS, 平均 ${avgThroughput.toFixed(1)} RPS`);

      // 吞吐量应该相对稳定
      const maxThroughput = Math.max(...throughputs);
      const minThroughput = Math.min(...throughputs);
      const variation = ((maxThroughput - minThroughput) / avgThroughput) * 100;

      expect(variation).toBeLessThan(100); // 吞吐量变化不应超过100%
      expect(avgThroughput).toBeGreaterThan(5); // 平均吞吐量应大于5 RPS
    });
  });

  describe('性能基准测试', () => {
    it('应该达到性能基准要求', async () => {
      const benchmarks = [
        {
          name: '简单查询',
          query: `
            query WeiboAccountStats {
              weiboAccountStats { total online }
            }
          `,
          maxResponseTime: 200,
          minRequestsPerSecond: 20
        },
        {
          name: '列表查询',
          query: `
            query WeiboAccounts {
              weiboAccounts(filter: { page: 1, pageSize: 20 }) {
                edges { node { id weiboUid weiboNickname } }
                totalCount
              }
            }
          `,
          maxResponseTime: 500,
          minRequestsPerSecond: 10
        },
        {
          name: '搜索查询',
          query: `
            query SearchRawData {
              searchRawData(keyword: "test", page: 1, pageSize: 10) {
                items { id title }
                total
              }
            }
          `,
          maxResponseTime: 1000,
          minRequestsPerSecond: 5
        }
      ];

      const results = await Promise.all(
        benchmarks.map(async benchmark => {
          const result = await test.executeConcurrencyTest(
            () => test.executeQuery(benchmark.query),
            15,
            15
          );

          return {
            name: benchmark.name,
            ...result,
            passed: result.averageResponseTime <= benchmark.maxResponseTime &&
                    result.requestsPerSecond >= benchmark.minRequestsPerSecond &&
                    result.successRate >= 0.8
          };
        })
      );

      results.forEach(result => {
        console.log(`基准测试 "${result.name}":`, {
          平均响应时间: `${result.averageResponseTime.toFixed(0)}ms`,
          每秒请求数: result.requestsPerSecond.toFixed(1),
          成功率: `${(result.successRate * 100).toFixed(1)}%`,
          通过: result.passed ? '✓' : '✗'
        });

        expect(result.passed).toBe(true);
      });

      // 所有基准测试都应该通过
      const allPassed = results.every(r => r.passed);
      expect(allPassed).toBe(true);
    });
  });
});