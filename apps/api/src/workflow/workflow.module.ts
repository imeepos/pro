import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity, WorkflowExecutionEntity } from '@pro/entities';
import { WorkflowService } from './services/workflow.service';
import { WorkflowResolver } from './resolvers/workflow.resolver';
import { WorkflowTemplatesService } from './services/workflow-templates.service';
import { WorkflowTemplatesController } from './controllers/workflow-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity, WorkflowExecutionEntity])],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowService, WorkflowResolver, WorkflowTemplatesService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
