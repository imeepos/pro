import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNode } from '@/types/canvas';
import { clsx } from 'clsx';

export const WorkflowNodeComponent = memo(({ data, selected }: NodeProps<WorkflowNode['data']>) => {
  const { label, ports, validation } = data;

  const statusColor = {
    valid: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
  }[validation?.status || 'valid'];

  return (
    <div
      className={clsx(
        'px-4 py-2 rounded-lg border-2 bg-white shadow-md min-w-[180px]',
        selected ? 'border-blue-500 shadow-lg' : statusColor
      )}
    >
      {/* 输入端口 */}
      {ports.input.map((port, index) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: `${((index + 1) / (ports.input.length + 1)) * 100}%`,
            background: port.kind === 'control' ? '#f59e0b' : '#3b82f6',
            width: port.kind === 'control' ? 10 : 8,
            height: port.kind === 'control' ? 10 : 8,
            transform: port.kind === 'control' ? 'rotate(45deg)' : undefined,
          }}
          title={`${port.name} (${port.dataType || port.kind})`}
        />
      ))}

      {/* 节点内容 */}
      <div className="flex flex-col gap-1">
        <div className="font-semibold text-sm text-gray-800">{label}</div>
        {validation && validation.status !== 'valid' && (
          <div className="text-xs text-red-600 mt-1">
            {validation.messages.join(', ')}
          </div>
        )}
      </div>

      {/* 输出端口 */}
      {ports.output.map((port, index) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${((index + 1) / (ports.output.length + 1)) * 100}%`,
            background: port.kind === 'control' ? '#f59e0b' : '#10b981',
            width: port.kind === 'control' ? 10 : 8,
            height: port.kind === 'control' ? 10 : 8,
            transform: port.kind === 'control' ? 'rotate(45deg)' : undefined,
          }}
          title={`${port.name} (${port.dataType || port.kind})`}
        />
      ))}
    </div>
  );
});

WorkflowNodeComponent.displayName = 'WorkflowNode';
