import { Injectable } from '@nestjs/common';
import { runWeiboDetailWorkflow } from '@pro/workflow-nestjs';
import {
  convertWorkflowToAdminFormat,
  AdminWorkflowFormat,
} from '@pro/workflow-core';

@Injectable()
export class WorkflowTemplatesService {
  getWeiboDetailTemplate(): AdminWorkflowFormat {
    const workflow = runWeiboDetailWorkflow('sample-mblogid', 'sample-uid');
    workflow.setName('�Z�����\A');
    return convertWorkflowToAdminFormat(workflow);
  }
}
