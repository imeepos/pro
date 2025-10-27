import { Injectable } from '@pro/core';
import { execute, INode } from '@pro/workflow-core';

@Injectable()
export class ExecutorService {
    constructor() { }
    /**
       * 执行单个工作流
       */
    async executeWorkflow<T extends INode>(workflow: T):
        Promise<T> {
        try {
            // 使用 @pro/workflow 的执行引擎
            const result = await execute(workflow);
            return result;
        } catch (error) {
            throw error;
        }
    }
}