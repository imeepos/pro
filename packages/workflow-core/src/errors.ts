/**
 * @pro/workflow-core - 错误处理系统
 *
 * 错误是程序成长的机会
 * 每个错误都有其存在的意义
 * 理解错误，就是理解系统的边界
 */

import { AstState } from './types';

// 基础工作流错误类
export abstract class WorkflowErrorBase extends Error {
    abstract readonly code: string;
    abstract readonly category: ErrorCategory;

    constructor(
        message: string,
        workflowId?: string,
        nodeId?: string,
        cause?: Error
    ) {
        super(message);
        this.name = this.constructor.name;
        if (workflowId !== undefined) {
            this._workflowId = workflowId;
        }
        if (nodeId !== undefined) {
            this._nodeId = nodeId;
        }
        if (cause !== undefined) {
            this._cause = cause;
        }

        // 保持堆栈跟踪
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    private _workflowId?: string;
    private _nodeId?: string;
    private _cause?: Error;

    get workflowId(): string | undefined { return this._workflowId; }
    get nodeId(): string | undefined { return this._nodeId; }
    override get cause(): Error | undefined { return this._cause; }

    // 获取错误的完整描述
    getFullDescription(): string {
        const parts: string[] = [`[${this.code}] ${this.message}`];

        if (this.workflowId) {
            parts.push(`Workflow: ${this.workflowId}`);
        }

        if (this.nodeId) {
            parts.push(`Node: ${this.nodeId}`);
        }

        if (this.cause) {
            parts.push(`Cause: ${this.cause.message}`);
        }

        return parts.join(' | ');
    }

    // 转换为JSON格式
    toJSON(): Record<string, any> {
        return {
            name: this.name,
            code: this.code,
            category: this.category,
            message: this.message,
            workflowId: this.workflowId,
            nodeId: this.nodeId,
            cause: this.cause ? {
                name: this.cause.name,
                message: this.cause.message
            } : undefined,
            stack: this.stack
        };
    }
}

// 错误类别枚举
export enum ErrorCategory {
    VALIDATION = 'VALIDATION',
    EXECUTION = 'EXECUTION',
    STATE = 'STATE',
    NETWORK = 'NETWORK',
    TIMEOUT = 'TIMEOUT',
    CONFIGURATION = 'CONFIGURATION',
    SYSTEM = 'SYSTEM'
}

// 验证错误 - 工作流结构或配置问题
export class ValidationError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_VALIDATION_ERROR';
    readonly category = ErrorCategory.VALIDATION;

    constructor(
        message: string,
        workflowId?: string,
        details?: Record<string, any>
    ) {
        super(message, workflowId);
        if (details !== undefined) {
            this.details = details;
        }
    }

    public readonly details?: Record<string, any>;
}

// 执行错误 - 节点执行过程中的错误
export class ExecutionError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_EXECUTION_ERROR';
    readonly category = ErrorCategory.EXECUTION;

    constructor(
        message: string,
        nodeId: string,
        workflowId?: string,
        cause?: Error,
        public readonly retryAttempt?: number
    ) {
        super(message, workflowId, nodeId, cause);
    }
}

// 状态错误 - 节点状态转换错误
export class StateError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_STATE_ERROR';
    readonly category = ErrorCategory.STATE;

    constructor(
        message: string,
        nodeId: string,
        workflowId?: string,
        public readonly fromState?: AstState,
        public readonly toState?: AstState
    ) {
        super(message, workflowId, nodeId);
    }
}

// 网络错误 - HTTP请求或其他网络操作失败
export class NetworkError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_NETWORK_ERROR';
    readonly category = ErrorCategory.NETWORK;

    constructor(
        message: string,
        nodeId: string,
        workflowId?: string,
        public readonly url?: string,
        public readonly statusCode?: number,
        cause?: Error
    ) {
        super(message, workflowId, nodeId, cause);
    }
}

// 超时错误 - 执行超时
export class TimeoutError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_TIMEOUT_ERROR';
    readonly category = ErrorCategory.TIMEOUT;

    constructor(
        message: string,
        nodeId: string,
        workflowId?: string,
        public readonly timeoutMs?: number,
        public readonly actualTimeMs?: number
    ) {
        super(message, workflowId, nodeId);
    }
}

// 配置错误 - 工作流配置问题
export class ConfigurationError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_CONFIGURATION_ERROR';
    readonly category = ErrorCategory.CONFIGURATION;

    constructor(
        message: string,
        workflowId?: string,
        public readonly configPath?: string,
        public readonly configValue?: any
    ) {
        super(message, workflowId);
    }
}

// 系统错误 - 底层系统错误
export class SystemError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_SYSTEM_ERROR';
    readonly category = ErrorCategory.SYSTEM;

    constructor(
        message: string,
        workflowId?: string,
        public readonly systemInfo?: Record<string, any>,
        cause?: Error
    ) {
        super(message, workflowId, undefined, cause);
    }
}

// 工作流死锁错误
export class DeadlockError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_DEADLOCK_ERROR';
    readonly category = ErrorCategory.EXECUTION;

    constructor(
        workflowId?: string,
        public readonly waitingNodes?: string[]
    ) {
        super(
            'Workflow deadlock detected: circular dependencies or resource conflicts',
            workflowId,
            'deadlock'
        );
    }
}

// 工作流循环依赖错误
export class CycleError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_CYCLE_ERROR';
    readonly category = ErrorCategory.VALIDATION;

    constructor(
        workflowId?: string,
        public readonly cycleNodes?: string[]
    ) {
        super(
            'Workflow contains cycles, which is not allowed in a DAG',
            workflowId
        );
    }
}

// 资源不足错误
export class ResourceError extends WorkflowErrorBase {
    readonly code = 'WORKFLOW_RESOURCE_ERROR';
    readonly category = ErrorCategory.SYSTEM;

    constructor(
        message: string,
        workflowId?: string,
        public readonly resourceType?: string,
        public readonly resourceLimit?: number,
        public readonly currentUsage?: number
    ) {
        super(
            message,
            workflowId,
            undefined,
            new Error(`Resource limit exceeded: ${resourceType}`)
        );
    }
}

// 错误工厂 - 创建标准化错误
export class ErrorFactory {
    // 创建验证错误
    static validation(
        message: string,
        workflowId?: string,
        details?: Record<string, any>
    ): ValidationError {
        return new ValidationError(message, workflowId, details);
    }

    // 创建执行错误
    static execution(
        message: string,
        nodeId: string,
        workflowId?: string,
        cause?: Error,
        retryAttempt?: number
    ): ExecutionError {
        return new ExecutionError(message, nodeId, workflowId, cause, retryAttempt);
    }

    // 创建状态错误
    static state(
        message: string,
        nodeId: string,
        fromState?: AstState,
        toState?: AstState,
        workflowId?: string
    ): StateError {
        return new StateError(message, nodeId, workflowId || '', fromState, toState);
    }

    // 创建网络错误
    static network(
        message: string,
        nodeId: string,
        url?: string,
        statusCode?: number,
        workflowId?: string,
        cause?: Error
    ): NetworkError {
        return new NetworkError(message, nodeId, workflowId || '', url, statusCode, cause);
    }

    // 创建超时错误
    static timeout(
        message: string,
        nodeId: string,
        timeoutMs?: number,
        actualTimeMs?: number,
        workflowId?: string
    ): TimeoutError {
        return new TimeoutError(message, nodeId, workflowId || '', timeoutMs, actualTimeMs);
    }

    // 创建配置错误
    static configuration(
        message: string,
        configPath?: string,
        configValue?: any,
        workflowId?: string
    ): ConfigurationError {
        return new ConfigurationError(message, workflowId || '', configPath, configValue);
    }

    // 创建系统错误
    static system(
        message: string,
        systemInfo?: Record<string, any>,
        workflowId?: string,
        cause?: Error
    ): SystemError {
        return new SystemError(message, workflowId || '', systemInfo, cause);
    }

    // 从通用错误创建工作流错误
    static fromError(
        error: Error,
        nodeId?: string,
        workflowId?: string,
        category?: ErrorCategory
    ): WorkflowErrorBase {
        if (error instanceof WorkflowErrorBase) {
            return error;
        }

        // 根据错误消息或类型推断错误类别
        const inferredCategory = category || this.inferErrorCategory(error);
        const message = error.message || 'Unknown error occurred';

        switch (inferredCategory) {
            case ErrorCategory.NETWORK:
                return new NetworkError(message, nodeId || '', '', undefined, undefined, error);
            case ErrorCategory.TIMEOUT:
                return new TimeoutError(message, nodeId || '', '');
            case ErrorCategory.VALIDATION:
                return new ValidationError(message, workflowId || '');
            case ErrorCategory.EXECUTION:
                return new ExecutionError(message, nodeId || 'unknown', workflowId || '', error);
            default:
                return new SystemError(message, workflowId || '', undefined, error);
        }
    }

    // 根据错误特征推断错误类别
    private static inferErrorCategory(error: Error): ErrorCategory {
        const message = error.message.toLowerCase();
        const name = error.constructor.name.toLowerCase();

        if (message.includes('timeout') || name.includes('timeout')) {
            return ErrorCategory.TIMEOUT;
        }

        if (message.includes('network') || message.includes('fetch') ||
            message.includes('request') || name.includes('network') ||
            name.includes('fetch')) {
            return ErrorCategory.NETWORK;
        }

        if (message.includes('validation') || message.includes('invalid') ||
            name.includes('validation')) {
            return ErrorCategory.VALIDATION;
        }

        if (message.includes('execution') || name.includes('execution')) {
            return ErrorCategory.EXECUTION;
        }

        return ErrorCategory.SYSTEM;
    }
}

// 错误处理器 - 统一的错误处理逻辑
export class ErrorHandler {
    private errorListeners: Array<(error: WorkflowErrorBase) => void> = [];
    private errorStats: Map<string, number> = new Map();

    // 添加错误监听器
    addListener(listener: (error: WorkflowErrorBase) => void): void {
        this.errorListeners.push(listener);
    }

    // 移除错误监听器
    removeListener(listener: (error: WorkflowErrorBase) => void): void {
        const index = this.errorListeners.indexOf(listener);
        if (index > -1) {
            this.errorListeners.splice(index, 1);
        }
    }

    // 处理错误
    async handle(error: WorkflowErrorBase): Promise<void> {
        // 记录错误统计
        const errorKey = `${error.code}:${error.category}`;
        this.errorStats.set(errorKey, (this.errorStats.get(errorKey) || 0) + 1);

        // 通知所有监听器
        for (const listener of this.errorListeners) {
            try {
                await listener(error);
            } catch (listenerError) {
                console.error('Error in error listener:', listenerError);
            }
        }

        // 默认日志输出
        console.error('Workflow Error:', error.getFullDescription());
        if (error.cause) {
            console.error('Caused by:', error.cause);
        }
    }

    // 获取错误统计
    getErrorStats(): Record<string, number> {
        return Object.fromEntries(this.errorStats);
    }

    // 清除错误统计
    clearStats(): void {
        this.errorStats.clear();
    }
}

// 全局错误处理器实例
export const globalErrorHandler = new ErrorHandler();

// 错误恢复策略
export enum RecoveryStrategy {
    RETRY = 'RETRY',
    SKIP = 'SKIP',
    FAIL_FAST = 'FAIL_FAST',
    CONTINUE = 'CONTINUE'
}

// 错误恢复配置
export interface ErrorRecoveryConfig {
    strategy: RecoveryStrategy;
    maxRetries?: number;
    retryDelay?: number;
    skipOnFailure?: boolean;
    continueOnFailure?: boolean;
}

// 错误恢复管理器
export class ErrorRecoveryManager {
    private configs: Map<string, ErrorRecoveryConfig> = new Map();

    // 设置错误恢复配置
    setConfig(errorCode: string, config: ErrorRecoveryConfig): void {
        this.configs.set(errorCode, config);
    }

    // 获取错误恢复配置
    getConfig(errorCode: string): ErrorRecoveryConfig | undefined {
        return this.configs.get(errorCode);
    }

    // 决定错误恢复策略
    decideRecovery(error: WorkflowErrorBase): ErrorRecoveryConfig {
        const config = this.getConfig(error.code);

        if (config) {
            return config;
        }

        // 默认恢复策略
        return {
            strategy: RecoveryStrategy.FAIL_FAST,
            maxRetries: 3,
            retryDelay: 1000
        };
    }

    // 执行错误恢复
    async recover(
        error: WorkflowErrorBase,
        retryFn: () => Promise<any>
    ): Promise<any> {
        const config = this.decideRecovery(error);

        switch (config.strategy) {
            case RecoveryStrategy.RETRY:
                return await this.executeWithRetry(retryFn, config);

            case RecoveryStrategy.SKIP:
                console.warn(`Skipping execution due to error: ${error.message}`);
                return null;

            case RecoveryStrategy.FAIL_FAST:
                throw error;

            case RecoveryStrategy.CONTINUE:
                console.warn(`Continuing execution despite error: ${error.message}`);
                return null;

            default:
                throw error;
        }
    }

    // 带重试的执行
    private async executeWithRetry(
        fn: () => Promise<any>,
        config: ErrorRecoveryConfig
    ): Promise<any> {
        const maxRetries = config.maxRetries || 3;
        const retryDelay = config.retryDelay || 1000;

        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    throw lastError;
                }

                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            }
        }

        throw lastError!;
    }
}

// 全局错误恢复管理器
export const globalRecoveryManager = new ErrorRecoveryManager();