import 'reflect-metadata';
import "dotenv/config"
import { runWeiBoKeywordSearchWorkflow } from '@pro/workflow-nestjs';
import { root } from '@pro/core';
import { registerMqQueues } from '@pro/workflow-core';

async function bootstrap() {
  // 注册 MQ 队列配置
  registerMqQueues()
  await root.init();
  runWeiBoKeywordSearchWorkflow()
}
bootstrap();
