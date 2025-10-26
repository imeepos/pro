import { Injectable, Logger } from '@nestjs/common';
import { execute, INode } from '@pro/workflow-core';

@Injectable()
export class ExecutorService {
    private readonly logger = new Logger(ExecutorService.name);
    constructor() { }
    /**
       * 执行单个工作流
       */
    async executeWorkflow<T extends INode>(workflow: T):
        Promise<T> {
        try {
            this.logger.log(`开始执行工作流: ${workflow.id} (${workflow.type})`);
            // 使用 @pro/workflow 的执行引擎
            const result = await execute(workflow);
            this.logger.log(`工作流执行完成: ${workflow.id} -> ${result.state}`);
            return result;
        } catch (error) {
            this.logger.error(
                `工作流执行失败: ${workflow.id}`,
                (error as Error).stack
            );
            throw error;
        }
    }
}