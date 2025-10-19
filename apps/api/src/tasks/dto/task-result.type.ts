import { ObjectType, Field } from '@nestjs/graphql';

/**
 * 任务触发结果
 *
 * 设计原则：
 * - 简洁明了：只返回操作结果和必要信息
 * - 一致性：所有触发接口使用统一的返回类型
 * - 可追溯：提供 message 字段用于日志和调试
 */
@ObjectType()
export class TaskResult {
  @Field(() => Boolean, { description: '任务是否成功发布到队列' })
  success: boolean;

  @Field(() => String, { description: '结果消息' })
  message: string;

  @Field(() => String, {
    description: '任务ID或相关标识',
    nullable: true,
  })
  taskId?: string;
}
