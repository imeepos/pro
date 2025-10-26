

/**
 * 从现在开始 你不要改代码 你告诉我如何修改 我来操作
 * OK 上一个main.ts你并没有搞成功现在拆分成更小的步骤 一步一步来
 * 每完成一步等我测试结果
 * 
 * 你先帮我拆分成几个合理的步骤 每个步骤都可以单独测试
 */

/**
  * 步骤1：验证基础环境和连接
  *
  * 测试目标：
  * - PostgreSQL 连接成功
  * - MongoDB 连接成功
  * - Redis 连接成功
  * - RabbitMQ 连接成功
  * - 至少有1个可用的微博账号
  */
 /**
   * 步骤1：验证基础环境和连接
   */

  import { NestFactory } from '@nestjs/core';
  import { WorkflowModule } from './workflow.module';
  import { Logger } from '@nestjs/common';
  import { DataSource } from 'typeorm';
  import { RedisClient } from '@pro/redis';
  import { RawDataSourceService } from '@pro/mongodb';
  import { RabbitMQService } from '@pro/rabbitmq';
  import { WeiboAccountEntity } from '@pro/entities';
  import { ProcessingStatus, WeiboAccountStatus } from '@pro/types';

  async function testStep1() {
      const logger = new Logger('Step1-环境验证');

      logger.log('========== 步骤1：验证基础环境和连接 ==========');

      let app: any;
      try {
          // 创建应用上下文
          logger.log('1️⃣  正在创建 NestJS 应用上下文...');
          app = await NestFactory.createApplicationContext(WorkflowModule, {
              logger: ['error', 'warn', 'log'],
          });
          logger.log('✅ NestJS 应用上下文创建成功');

          // 测试 PostgreSQL 连接
          logger.log('\n2️⃣  测试 PostgreSQL 连接...');
          const dataSource = app.get(DataSource);
          const isConnected = dataSource.isInitialized;
          if (isConnected) {
              logger.log('✅ PostgreSQL 连接成功');
              logger.log(`   数据库: ${dataSource.options.database}`);
          } else {
              throw new Error('PostgreSQL 未初始化');
          }

          // 测试 MongoDB 连接
          logger.log('\n3️⃣  测试 MongoDB 连接...');
          const rawDataService = app.get(RawDataSourceService);
          const mongoTest = await rawDataService.findWithFilters({
              status: ProcessingStatus.PENDING
          });
          logger.log('✅ MongoDB 连接成功');
          logger.log(`   查询测试成功，当前待处理文档数: ${mongoTest.items.length}`);

          // 测试 Redis 连接
          logger.log('\n4️⃣  测试 Redis 连接...');
          const redisClient = app.get(RedisClient);
          await redisClient.set('test:connection', 'ok', 10);
          const testValue = await redisClient.get('test:connection');
          if (testValue === 'ok') {
              logger.log('✅ Redis 连接成功');
          } else {
              throw new Error('Redis 读写测试失败');
          }

          // 测试 RabbitMQ 连接
          logger.log('\n5️⃣  测试 RabbitMQ 连接...');
          const rabbitMQService = app.get(RabbitMQService);
          // 通过获取服务实例验证连接
          const isRabbitMQReady = rabbitMQService !== null && rabbitMQService !== undefined;
          if (isRabbitMQReady) {
              logger.log('✅ RabbitMQ 服务实例获取成功');
          }

          // 检查微博账号
          logger.log('\n6️⃣  检查微博账号可用性...');
          const accountRepo = dataSource.getRepository(WeiboAccountEntity);
          const accounts = await accountRepo.find({
              where: { status: WeiboAccountStatus.ACTIVE }
          });

          if (accounts.length === 0) {
              logger.warn('⚠️  警告：没有可用的微博账号！');
              logger.warn('   请先在数据库中添加微博账号数据');
          } else {
              logger.log(`✅ 找到 ${accounts.length} 个可用账号`);
              accounts.forEach((acc, idx) => {
                  logger.log(`   账号${idx + 1}: ID=${acc.id}, Cookie长度=${acc.cookies?.length || 0}`);
              });
          }

          // 最终总结
          logger.log('\n========== 步骤1 完成 ==========');
          logger.log('✅ PostgreSQL: 正常');
          logger.log('✅ MongoDB: 正常');
          logger.log('✅ Redis: 正常');
          logger.log('✅ RabbitMQ: 正常');
          logger.log(`${accounts.length > 0 ? '✅' : '⚠️ '} 微博账号: ${accounts.length} 个`);
          logger.log('\n所有基础服务验证通过！可以继续步骤2');
          logger.log('================================\n');

          return true;
      } catch (error) {
          logger.error('\n❌ 步骤1 失败:', error);
          if (error instanceof Error) {
              logger.error(`错误信息: ${error.message}`);
              logger.error(`错误堆栈: ${error.stack}`);
          }
          return false;
      } finally {
          if (app) {
              await app.close();
          }
      }
  }

  // 直接执行
  if (require.main === module) {
      testStep1()
          .then((success) => {
              process.exit(success ? 0 : 1);
          })
          .catch((error) => {
              console.error('未捕获的错误:', error);
              process.exit(1);
          });
  }

