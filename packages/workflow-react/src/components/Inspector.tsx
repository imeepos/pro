import { useMemo } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { useReactFlow } from 'reactflow';

export const Inspector = () => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const { getNodes } = useReactFlow();

  const selectedNode = useMemo(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length === 1) {
      return nodes.find((n) => n.id === selectedNodes[0].id);
    }
    return null;
  }, [nodes, getNodes]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
        <div className="text-sm text-gray-500 text-center py-8">请选择一个节点</div>
      </div>
    );
  }

  const handleConfigChange = (key: string, value: unknown) => {
    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        [key]: value,
      },
    });
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* 节点信息 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-lg text-gray-800">{selectedNode.data.label}</h3>
        <p className="text-xs text-gray-500 mt-1">ID: {selectedNode.id}</p>
      </div>

      {/* 端口信息 */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-sm text-gray-700 mb-2">输入端口</h4>
        <div className="space-y-2">
          {selectedNode.data.ports.input.map((port) => (
            <div key={port.id} className="text-sm">
              <span className="font-medium text-gray-800">{port.name}</span>
              <span className="text-gray-500 ml-2">
                ({port.dataType || port.kind})
                {port.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </div>
          ))}
        </div>

        <h4 className="font-medium text-sm text-gray-700 mt-4 mb-2">输出端口</h4>
        <div className="space-y-2">
          {selectedNode.data.ports.output.map((port) => (
            <div key={port.id} className="text-sm">
              <span className="font-medium text-gray-800">{port.name}</span>
              <span className="text-gray-500 ml-2">({port.dataType || port.kind})</span>
            </div>
          ))}
        </div>
      </div>

      {/* 配置表单 */}
      <div className="p-4 flex-1">
        <h4 className="font-medium text-sm text-gray-700 mb-3">节点配置</h4>
        <div className="space-y-3">
          {Object.keys(selectedNode.data.config).length === 0 ? (
            <p className="text-sm text-gray-500">此节点无需配置</p>
          ) : (
            Object.entries(selectedNode.data.config).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={String(value)}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 验证信息 */}
      {selectedNode.data.validation && selectedNode.data.validation.status !== 'valid' && (
        <div className="p-4 border-t border-gray-200 bg-red-50">
          <h4 className="font-medium text-sm text-red-700 mb-2">验证错误</h4>
          <ul className="text-sm text-red-600 space-y-1">
            {selectedNode.data.validation.messages.map((msg, idx) => (
              <li key={idx}>• {msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
