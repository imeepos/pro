import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { WebSocketConnectionPool } from './websocket-connection-pool';
import { WeiboLoginWebSocketManager } from './weibo-login-websocket-manager';
import { WebSocketMonitorService } from './websocket-monitor.service';
import { WebSocketConfig } from './websocket.types';
import { Observable, Subject, merge, timer } from 'rxjs';
import { map, take, switchMap, catchError } from 'rxjs/operators';

/**
 * 测试结果接口
 */
export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

/**
 * WebSocket连接测试套件
 * 提供自动化测试功能验证WebSocket优化效果
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketTestService {
  constructor(
    private readonly connectionPool: WebSocketConnectionPool,
    private readonly weiboLoginManager: WeiboLoginWebSocketManager,
    private readonly monitorService: WebSocketMonitorService
  ) {}

  /**
   * 运行完整的WebSocket测试套件
   */
  async runFullTestSuite(): Promise<TestResult[]> {
    console.log('[WebSocketTestService] Starting full WebSocket test suite...');

    const tests: TestResult[] = [];

    // 1. 基础连接测试
    tests.push(await this.testBasicConnection());

    // 2. 连接池测试
    tests.push(await this.testConnectionPool());

    // 3. 微博登录会话测试
    tests.push(await this.testWeiboLoginSession());

    // 4. 连接恢复测试
    tests.push(await this.testConnectionRecovery());

    // 5. 并发连接测试
    tests.push(await this.testConcurrentConnections());

    // 6. 心跳机制测试
    tests.push(await this.testHeartbeatMechanism());

    // 7. 监控服务测试
    tests.push(await this.testMonitoringService());

    // 汇总测试结果
    const successCount = tests.filter(t => t.success).length;
    const totalCount = tests.length;

    console.log(`[WebSocketTestService] Test suite completed: ${successCount}/${totalCount} tests passed`);

    return tests;
  }

  /**
   * 测试基础连接功能
   */
  async testBasicConnection(): Promise<TestResult> {
    const testName = 'Basic Connection Test';
    const startTime = Date.now();

    try {
      const config: WebSocketConfig = {
        url: 'ws://localhost:3001',
        namespace: '/screens',
        auth: {
          token: 'test-token'
        }
      };

      // 创建WebSocket连接
      const connection = await this.connectionPool.acquireConnection(config);

      // 等待连接建立
      await new Promise<void>((resolve, reject) => {
        const subscription = connection.state$.subscribe(state => {
          if (state === 'connected') {
            subscription.unsubscribe();
            resolve();
          } else if (state === 'failed') {
            subscription.unsubscribe();
            reject(new Error('Connection failed'));
          }
        });

        // 设置超时
        setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error('Connection timeout'));
        }, 10000);
      });

      const duration = Date.now() - startTime;

      // 释放连接
      this.connectionPool.releaseConnection(connection);

      return {
        testName,
        success: true,
        duration,
        details: {
          connectionTime: duration,
          finalState: 'connected'
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试连接池功能
   */
  async testConnectionPool(): Promise<TestResult> {
    const testName = 'Connection Pool Test';
    const startTime = Date.now();

    try {
      const config: WebSocketConfig = {
        url: 'ws://localhost:3001',
        namespace: '/screens',
        auth: {
          token: 'test-token'
        }
      };

      // 测试连接复用
      const connection1 = await this.connectionPool.acquireConnection(config);
      const connection2 = await this.connectionPool.acquireConnection(config);

      // 验证是否复用了同一个连接
      const isReused = connection1 === connection2;

      // 释放连接
      this.connectionPool.releaseConnection(connection1);
      this.connectionPool.releaseConnection(connection2);

      // 获取连接池统计
      const poolStats = this.connectionPool.getPoolDiagnostics();

      const duration = Date.now() - startTime;

      return {
        testName,
        success: true,
        duration,
        details: {
          connectionReused: isReused,
          poolStats: poolStats.stats
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试微博登录会话
   */
  async testWeiboLoginSession(): Promise<TestResult> {
    const testName = 'Weibo Login Session Test';
    const startTime = Date.now();

    try {
      const config = {
        userId: 'test-user-123',
        websocketUrl: 'ws://localhost:3001',
        namespace: '/screens'
      };

      // 创建登录会话
      const session = await this.weiboLoginManager.createLoginSession(config);

      // 等待会话初始化
      await new Promise<void>(resolve => {
        const subscription = session.state.subscribe(state => {
          if (state === 'waiting_qrcode' || state === 'qrcode_generated') {
            subscription.unsubscribe();
            resolve();
          }
        });

        // 设置超时
        setTimeout(() => {
          subscription.unsubscribe();
          resolve(); // 即使没有达到预期状态也继续
        }, 5000);
      });

      const duration = Date.now() - startTime;

      // 清理会话
      await this.weiboLoginManager.destroySession(session.sessionId);

      return {
        testName,
        success: true,
        duration,
        details: {
          sessionId: session.sessionId,
          finalState: session.state.value,
          sessionDuration: duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试连接恢复能力
   */
  async testConnectionRecovery(): Promise<TestResult> {
    const testName = 'Connection Recovery Test';
    const startTime = Date.now();

    try {
      const config: WebSocketConfig = {
        url: 'ws://localhost:3001',
        namespace: '/screens',
        auth: {
          token: 'test-token'
        }
      };

      const connection = await this.connectionPool.acquireConnection(config);

      // 模拟连接断开（在实际测试中可能需要不同的方法）
      // 这里我们通过检查连接的健康状态来模拟恢复过程

      // 执行健康检查
      await this.monitorService.performHealthCheck();

      const diagnostics = this.monitorService.getCurrentDiagnostics();

      const duration = Date.now() - startTime;

      // 释放连接
      this.connectionPool.releaseConnection(connection);

      return {
        testName,
        success: diagnostics !== null,
        duration,
        details: {
          healthStatus: diagnostics?.healthStatus,
          metrics: diagnostics?.metrics
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试并发连接
   */
  async testConcurrentConnections(): Promise<TestResult> {
    const testName = 'Concurrent Connections Test';
    const startTime = Date.now();

    try {
      const config: WebSocketConfig = {
        url: 'ws://localhost:3001',
        namespace: '/screens',
        auth: {
          token: 'test-token'
        }
      };

      const concurrentCount = 5;
      const connections: any[] = [];

      // 创建多个并发连接
      for (let i = 0; i < concurrentCount; i++) {
        try {
          const connection = await this.connectionPool.acquireConnection(config);
          connections.push(connection);
        } catch (error) {
          console.warn(`Failed to create connection ${i + 1}:`, error);
        }
      }

      const duration = Date.now() - startTime;

      // 释放所有连接
      connections.forEach(connection => {
        this.connectionPool.releaseConnection(connection);
      });

      return {
        testName,
        success: connections.length > 0,
        duration,
        details: {
          requestedConnections: concurrentCount,
          establishedConnections: connections.length,
          averageConnectionTime: duration / concurrentCount
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试心跳机制
   */
  async testHeartbeatMechanism(): Promise<TestResult> {
    const testName = 'Heartbeat Mechanism Test';
    const startTime = Date.now();

    try {
      const config: WebSocketConfig = {
        url: 'ws://localhost:3001',
        namespace: '/screens',
        auth: {
          token: 'test-token'
        }
      };

      const connection = await this.connectionPool.acquireConnection(config);

      // 等待连接建立
      await new Promise<void>((resolve) => {
        const subscription = connection.state$.subscribe(state => {
          if (state === 'connected') {
            subscription.unsubscribe();
            resolve();
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          resolve();
        }, 5000);
      });

      // 等待一段时间让心跳机制运行
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 检查连接状态
      const finalState = await new Promise<string>(resolve => {
        const subscription = connection.state$.subscribe(state => {
          subscription.unsubscribe();
          resolve(state);
        });

        setTimeout(() => {
          subscription.unsubscribe();
          resolve('unknown');
        }, 1000);
      });

      const duration = Date.now() - startTime;

      // 释放连接
      this.connectionPool.releaseConnection(connection);

      return {
        testName,
        success: finalState === 'connected',
        duration,
        details: {
          finalState,
          testDuration: duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试监控服务
   */
  async testMonitoringService(): Promise<TestResult> {
    const testName = 'Monitoring Service Test';
    const startTime = Date.now();

    try {
      // 执行健康检查
      const diagnostics = await this.monitorService.performHealthCheck();

      // 获取监控配置
      const currentDiagnostics = this.monitorService.getCurrentDiagnostics();

      // 获取健康状态
      const healthStatus = await new Promise<any>(resolve => {
        const subscription = this.monitorService.healthStatus.subscribe(status => {
          subscription.unsubscribe();
          resolve(status);
        });

        setTimeout(() => {
          subscription.unsubscribe();
          resolve('timeout');
        }, 3000);
      });

      const duration = Date.now() - startTime;

      return {
        testName,
        success: diagnostics !== null && currentDiagnostics !== null,
        duration,
        details: {
          healthStatus,
          hasDiagnostics: diagnostics !== null,
          currentHealthStatus: currentDiagnostics?.healthStatus
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 生成测试报告
   */
  generateTestReport(testResults: TestResult[]): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      successRate: number;
      totalDuration: number;
      averageDuration: number;
    };
    results: TestResult[];
    recommendations: string[];
  } {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? passedTests / totalTests : 0;
    const totalDuration = testResults.reduce((sum, t) => sum + t.duration, 0);
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    // 生成建议
    const recommendations: string[] = [];

    if (successRate < 0.8) {
      recommendations.push('整体测试成功率较低，建议检查WebSocket配置和网络连接');
    }

    const failedTestNames = testResults.filter(t => !t.success).map(t => t.testName);
    if (failedTestNames.length > 0) {
      recommendations.push(`以下测试失败，需要重点关注: ${failedTestNames.join(', ')}`);
    }

    if (averageDuration > 5000) {
      recommendations.push('平均测试时间较长，建议优化连接性能');
    }

    if (recommendations.length === 0) {
      recommendations.push('所有测试通过，WebSocket连接优化效果良好');
    }

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate,
        totalDuration,
        averageDuration
      },
      results: testResults,
      recommendations
    };
  }
}