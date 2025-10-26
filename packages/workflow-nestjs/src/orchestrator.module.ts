import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    WeiboPostEntity,
    WeiboCommentEntity,
    WeiboUserEntity,
    WeiboHashtagEntity,
    WeiboPostHashtagEntity,
    WeiboMediaEntity,
    WeiboUserStatsEntity,
} from '@pro/entities';
import { WorkflowModule } from './workflow.module';

/**
 * 工作流编排器模块 - 集成Cleaner相关实体
 *
 * 此模块扩展WorkflowModule,添加清洗服务需要的TypeORM实体,
 * 使main.ts可以在单进程中完成: 采集 → 清洗 → 入库 的完整流程
 */
@Module({
    imports: [
        WorkflowModule,
        TypeOrmModule.forFeature([
            WeiboPostEntity,
            WeiboCommentEntity,
            WeiboUserEntity,
            WeiboHashtagEntity,
            WeiboPostHashtagEntity,
            WeiboMediaEntity,
            WeiboUserStatsEntity,
        ]),
    ],
    exports: [WorkflowModule],
})
export class WorkflowOrchestratorModule {}
