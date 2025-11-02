import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { WorkflowTemplatesService } from '../services/workflow-templates.service';
import { AdminWorkflowFormat } from '@pro/workflow-core';

@Controller('api/workflows/templates')
export class WorkflowTemplatesController {
  constructor(private readonly templatesService: WorkflowTemplatesService) {}

  @Get('weibo-detail')
  getWeiboDetailTemplate(): AdminWorkflowFormat {
    try {
      return this.templatesService.getWeiboDetailTemplate();
    } catch (error) {
      throw new HttpException(
        'Failed to generate workflow template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
