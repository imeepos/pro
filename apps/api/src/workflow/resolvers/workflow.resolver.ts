import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorkflowModel } from '../models/workflow.model';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowFilterInput } from '../dto/workflow-filter.input';
import { SaveWorkflowInput } from '../dto/save-workflow.input';
import { WorkflowExecutionConnectionModel, WorkflowExecutionModel } from '../models/workflow-execution.model';
import { TriggerWorkflowInput } from '../dto/trigger-workflow.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => WorkflowModel)
export class WorkflowResolver {
  constructor(private readonly workflowService: WorkflowService) {}

  @Query(() => [WorkflowModel])
  async workflows(
    @Args('filter', { type: () => WorkflowFilterInput, nullable: true })
    filter?: WorkflowFilterInput,
  ): Promise<WorkflowModel[]> {
    return this.workflowService.listWorkflows(filter);
  }

  @Query(() => WorkflowModel, { nullable: true })
  async workflow(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WorkflowModel | null> {
    return this.workflowService.getWorkflowById(id);
  }

  @Query(() => WorkflowExecutionConnectionModel)
  async workflowExecutions(
    @Args('workflowId', { type: () => ID }) workflowId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit = 20,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string | null,
  ): Promise<WorkflowExecutionConnectionModel> {
    return this.workflowService.listExecutions(workflowId, limit, cursor);
  }

  @Mutation(() => WorkflowModel)
  async saveWorkflow(
    @Args('input', { type: () => SaveWorkflowInput }) input: SaveWorkflowInput,
    @CurrentUser('userId') userId?: string,
  ): Promise<WorkflowModel> {
    return this.workflowService.saveWorkflow(input, userId);
  }

  @Mutation(() => Boolean)
  async deleteWorkflow(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.workflowService.deleteWorkflow(id);
  }

  @Mutation(() => WorkflowModel)
  async cloneWorkflow(
    @Args('id', { type: () => ID }) id: string,
    @Args('name', { type: () => String }) name: string,
    @Args('slug', { type: () => String }) slug: string,
    @CurrentUser('userId') userId?: string,
  ): Promise<WorkflowModel> {
    return this.workflowService.cloneWorkflow(id, name, slug, userId);
  }

  @Mutation(() => WorkflowExecutionModel)
  async triggerWorkflow(
    @Args('input', { type: () => TriggerWorkflowInput })
    input: TriggerWorkflowInput,
    @CurrentUser('userId') userId?: string,
  ): Promise<WorkflowExecutionModel> {
    return this.workflowService.triggerWorkflow(input, userId);
  }
}
