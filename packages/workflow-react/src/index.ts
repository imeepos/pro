/**
 * @pro/workflow-react
 * React-based workflow canvas editor
 */

// 核心组件
export { WorkflowCanvas } from './components/WorkflowCanvas';
export { WorkflowNodeComponent } from './nodes/WorkflowNode';
export { NodePalette } from './components/NodePalette';
export { Inspector } from './components/Inspector';
export { Toolbar } from './components/Toolbar';

// 功能组件
export { TemplateSelector } from './components/TemplateSelector';
export { ExecutionMonitor } from './components/ExecutionMonitor';
export { ExecutionHistory } from './components/ExecutionHistory';
export { WorkflowConfig } from './components/WorkflowConfig';
export { VersionManager } from './components/VersionManager';
export { ProjectManager } from './components/ProjectManager';

// 状态管理
export { useWorkflowStore } from './store/workflow-store';

// 类型定义
export type { WorkflowNode, WorkflowEdge, NodeBlueprint, Port, CanvasState, CanvasCommand } from './types/canvas';

// 工具函数
export { generateBlueprintsFromWorkflowCore } from './utils/blueprint-generator';
export { serializeWorkflow, deserializeWorkflow, serializeTemplate, deserializeTemplate, createWorkflowFromTemplate } from './utils/workflow-serializer';
export { validateWorkflow, quickValidate } from './utils/workflow-validator';

// API集成
export { WorkflowApiClient, createWorkflowApiClient, WorkflowApiAdapter } from './api/workflow-api';
export type { WorkflowExecutionRequest, WorkflowExecutionResponse, WorkflowApiConfig } from './api/workflow-api';

// 存储管理
export { StorageManager, defaultStorageManager } from './utils/storage-manager';
export type { WorkflowProject, StorageConfig } from './utils/storage-manager';

// 模板系统
export { workflowTemplates, getTemplatesByCategory, searchTemplatesByTag, getTemplateById } from './templates/workflow-templates';
export type { WorkflowTemplate } from './templates/workflow-templates';

// 节点定义
export { extendedNodeBlueprints, getAllExtendedBlueprints, getBlueprintsByCategory, getAllCategories } from './templates/node-definitions';

// Web组件 (暂未实现)
// export { WorkflowWebComponent } from './web-component';
