import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity, WorkflowExecutionEntity } from '@pro/entities';
import { WorkflowService } from './services/workflow.service';
import { WorkflowResolver } from './resolvers/workflow.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity, WorkflowExecutionEntity])],
  providers: [WorkflowService, WorkflowResolver],
  exports: [WorkflowService],
})
export class WorkflowModule {}
