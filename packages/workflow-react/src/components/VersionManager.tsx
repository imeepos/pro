import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { serializeWorkflow, deserializeWorkflow } from '@/utils/workflow-serializer';

interface WorkflowVersion {
  id: string;
  version: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  changes: {
    type: 'major' | 'minor' | 'patch';
    message: string;
    nodes: number;
    edges: number;
  };
  workflowData: string; // 序列化的工作流数据
  isActive: boolean;
}

export const VersionManager = () => {
  const {
    nodes,
    edges,
    workflowInfo,
    exportWorkflow,
    importWorkflow,
    setState
  } = useWorkflowStore();

  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showVersionDiff, setShowVersionDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 版本创建表单
  const [newVersion, setNewVersion] = useState({
    type: 'patch' as 'major' | 'minor' | 'patch',
    message: '',
    description: ''
  });

  // 加载版本历史
  const loadVersions = () => {
    setLoading(true);
    try {
      // 从localStorage加载版本历史（实际项目中应该从后端API获取）
      const savedVersions = localStorage.getItem('workflow-versions');
      if (savedVersions) {
        const parsedVersions = JSON.parse(savedVersions);
        setVersions(parsedVersions.sort((a: WorkflowVersion, b: WorkflowVersion) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        // 创建初始版本
        createInitialVersion();
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  // 创建初始版本
  const createInitialVersion = () => {
    const initialVersion: WorkflowVersion = {
      id: 'v1',
      version: '1.0.0',
      name: workflowInfo.name || 'Initial Version',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
      changes: {
        type: 'major',
        message: 'Initial version',
        nodes: nodes.length,
        edges: edges.length
      },
      workflowData: exportWorkflow(true),
      isActive: true
    };

    setVersions([initialVersion]);
    saveVersions([initialVersion]);
  };

  // 保存版本到localStorage
  const saveVersions = (versionsToSave: WorkflowVersion[]) => {
    try {
      localStorage.setItem('workflow-versions', JSON.stringify(versionsToSave));
    } catch (error) {
      console.error('保存版本失败:', error);
    }
  };

  // 创建新版本
  const handleCreateVersion = () => {
    if (!newVersion.message.trim()) {
      alert('请输入版本更新说明');
      return;
    }

    const latestVersion = versions[0];
    let newVersionNumber = '';

    // 计算新版本号
    if (latestVersion) {
      const [major, minor, patch] = latestVersion.version.split('.').map(Number);

      switch (newVersion.type) {
        case 'major':
          newVersionNumber = `${major + 1}.0.0`;
          break;
        case 'minor':
          newVersionNumber = `${major}.${minor + 1}.0`;
          break;
        case 'patch':
          newVersionNumber = `${major}.${minor}.${patch + 1}`;
          break;
      }
    } else {
      newVersionNumber = '1.0.0';
    }

    const version: WorkflowVersion = {
      id: `v${Date.now()}`,
      version: newVersionNumber,
      name: `Version ${newVersionNumber}`,
      description: newVersion.description,
      createdAt: new Date().toISOString(),
      createdBy: 'Current User',
      changes: {
        type: newVersion.type,
        message: newVersion.message,
        nodes: nodes.length,
        edges: edges.length
      },
      workflowData: exportWorkflow(true),
      isActive: true
    };

    // 将之前版本设为非活跃
    const updatedVersions = versions.map(v => ({ ...v, isActive: false }));
    updatedVersions.unshift(version);

    setVersions(updatedVersions);
    saveVersions(updatedVersions);

    // 重置表单
    setNewVersion({ type: 'patch', message: '', description: '' });
    setShowCreateVersion(false);

    // 更新工作流信息中的版本号
    setState({
      workflowInfo: {
        ...workflowInfo,
        version: newVersionNumber,
        updatedAt: new Date().toISOString()
      }
    });
  };

  // 切换到指定版本
  const handleSwitchVersion = (version: WorkflowVersion) => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!confirm('切换版本将丢失当前未保存的更改，是否继续？')) {
        return;
      }
    }

    try {
      const result = importWorkflow(version.workflowData, {
        validateNodes: true,
        autoPositionNodes: true,
        createMissingBlueprints: true
      });

      if (result.warnings && result.warnings.length > 0) {
        console.warn('版本切换警告:', result.warnings);
      }

      // 更新活跃版本
      const updatedVersions = versions.map(v => ({
        ...v,
        isActive: v.id === version.id
      }));

      setVersions(updatedVersions);
      saveVersions(updatedVersions);
    } catch (error) {
      alert('切换版本失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除版本
  const handleDeleteVersion = (versionId: string) => {
    if (!confirm('确定要删除这个版本吗？此操作不可撤销。')) {
      return;
    }

    const updatedVersions = versions.filter(v => v.id !== versionId);
    setVersions(updatedVersions);
    saveVersions(updatedVersions);
  };

  // 比较版本差异
  const handleCompareVersions = (versionId: string) => {
    setShowVersionDiff(versionId);
  };

  // 格式化时间
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取版本类型样式
  const getVersionTypeStyle = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-800';
      case 'minor':
        return 'bg-blue-100 text-blue-800';
      case 'patch':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">版本管理</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadVersions}
              disabled={loading}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
            <button
              onClick={() => setShowCreateVersion(true)}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              + 新建版本
            </button>
          </div>
        </div>
      </div>

      {/* 版本列表 */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">暂无版本记录</div>
            <div className="text-sm">创建第一个版本开始管理工作流</div>
          </div>
        ) : (
          versions.map(version => (
            <div key={version.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{version.version}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getVersionTypeStyle(version.changes.type)}`}>
                        {version.changes.type === 'major' ? '主要' :
                         version.changes.type === 'minor' ? '次要' : '补丁'}
                      </span>
                      {version.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{version.changes.message}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(version.createdAt)} · {version.createdBy} ·
                      {version.changes.nodes} 节点 · {version.changes.edges} 连接
                    </div>
                    {version.description && (
                      <div className="text-sm text-gray-600 mt-1">{version.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!version.isActive && (
                    <button
                      onClick={() => handleSwitchVersion(version)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      切换
                    </button>
                  )}
                  <button
                    onClick={() => handleCompareVersions(version.id)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700"
                  >
                    比较
                  </button>
                  {!version.isActive && versions.length > 1 && (
                    <button
                      onClick={() => handleDeleteVersion(version.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建版本弹窗 */}
      {showCreateVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">创建新版本</h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  版本类型
                </label>
                <div className="flex space-x-3">
                  {[
                    { value: 'major', label: '主要版本', desc: '重大更新，不兼容' },
                    { value: 'minor', label: '次要版本', desc: '新功能，向后兼容' },
                    { value: 'patch', label: '补丁版本', desc: '问题修复，向后兼容' }
                  ].map(type => (
                    <label key={type.value} className="flex-1">
                      <input
                        type="radio"
                        name="version-type"
                        value={type.value}
                        checked={newVersion.type === type.value}
                        onChange={(e) => setNewVersion({ ...newVersion, type: e.target.value as any })}
                        className="sr-only"
                      />
                      <div className={`text-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        newVersion.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  更新说明 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVersion.message}
                  onChange={(e) => setNewVersion({ ...newVersion, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如: 修复数据处理节点错误"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细描述
                </label>
                <textarea
                  value={newVersion.description}
                  onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="可选的详细描述..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateVersion(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersion.message.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                创建版本
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 版本比较弹窗 */}
      {showVersionDiff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">版本比较</h4>
                <button
                  onClick={() => setShowVersionDiff(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center text-gray-500">
                版本比较功能正在开发中...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};