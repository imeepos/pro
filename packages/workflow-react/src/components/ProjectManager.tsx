import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { defaultStorageManager, type WorkflowProject } from '@/utils/storage-manager';

export const ProjectManager = () => {
  const [projects, setProjects] = useState<WorkflowProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [filterTag, setFilterTag] = useState<string>('all');

  const { reset } = useWorkflowStore();

  // 新建项目表单
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    category: 'general',
    tags: [] as string[]
  });

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await defaultStorageManager.getProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 过滤和排序项目
  const filteredAndSortedProjects = projects
    .filter(project => {
      // 搜索过滤
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // 标签过滤
      const matchesTag = filterTag === 'all' || project.metadata?.tags.includes(filterTag);

      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updatedAt':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  // 获取所有标签
  const allTags = Array.from(new Set(projects.flatMap(p => p.metadata?.tags || [])));

  // 创建新项目
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      alert('请输入项目名称');
      return;
    }

    try {
      await defaultStorageManager.saveProject({
        name: newProject.name,
        description: newProject.description,
        version: '1.0.0',
        nodes: [],
        edges: [],
        blueprints: {},
        metadata: {
          tags: newProject.tags,
          category: newProject.category,
          author: 'Current User'
        }
      });

      await loadProjects();
      setShowNewProjectModal(false);
      setNewProject({ name: '', description: '', category: 'general', tags: [] });
    } catch (error) {
      alert('创建项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 加载项目
  const handleLoadProject = async (projectId: string) => {
    try {
      const project = await defaultStorageManager.loadProject(projectId);
      if (!project) {
        alert('项目不存在');
        return;
      }

      // 清空当前工作流
      reset();

      // 设置项目数据
      useWorkflowStore.setState({
        nodes: project.nodes,
        edges: project.edges,
        blueprints: project.blueprints,
        workflowInfo: {
          name: project.name,
          description: project.description || '',
          version: project.version,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      });

      alert(`已加载项目: ${project.name}`);
    } catch (error) {
      alert('加载项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除项目
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      return;
    }

    try {
      await defaultStorageManager.deleteProject(projectId);
      await loadProjects();
    } catch (error) {
      alert('删除项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 复制项目
  const handleDuplicateProject = async (project: WorkflowProject) => {
    try {
      await defaultStorageManager.saveProject({
        name: `${project.name} (副本)`,
        description: project.description,
        version: '1.0.0',
        nodes: project.nodes,
        edges: project.edges,
        blueprints: project.blueprints,
        metadata: project.metadata
      });

      await loadProjects();
      alert('项目复制成功');
    } catch (error) {
      alert('复制项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 导出项目
  const handleExportProject = async (projectId: string) => {
    try {
      const jsonData = await defaultStorageManager.exportProject(projectId);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 导入项目
  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const jsonData = event.target?.result as string;
            const projectId = await defaultStorageManager.importProject(jsonData);
            await loadProjects();
            alert('项目导入成功');
          } catch (error) {
            alert('导入项目失败: ' + (error instanceof Error ? error.message : '未知错误'));
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // 批量操作
  const handleBatchDelete = async () => {
    if (selectedProjects.length === 0) {
      alert('请选择要删除的项目');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedProjects.length} 个项目吗？此操作不可撤销。`)) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await defaultStorageManager.deleteProject(projectId);
      }

      setSelectedProjects([]);
      await loadProjects();
      alert('批量删除成功');
    } catch (error) {
      alert('批量删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleBatchExport = async () => {
    if (selectedProjects.length === 0) {
      alert('请选择要导出的项目');
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await handleExportProject(projectId);
      }
      alert('批量导出成功');
    } catch (error) {
      alert('批量导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 选择/取消选择项目
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedProjects.length === filteredAndSortedProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredAndSortedProjects.map(p => p.id));
    }
  };

  // 格式化时间
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">项目管理</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleImportProject}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              导入项目
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              + 新建项目
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索项目..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有标签</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="updatedAt">按更新时间</option>
            <option value="createdAt">按创建时间</option>
            <option value="name">按名称</option>
          </select>
        </div>

        {/* 批量操作 */}
        {selectedProjects.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              已选择 {selectedProjects.length} 个项目
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchExport}
                className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
              >
                批量导出
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
              >
                批量删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 项目列表 */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg">加载中...</div>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">暂无项目</div>
            <div className="text-sm">创建第一个项目开始工作</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* 全选复选框 */}
            <div className="p-4 bg-gray-50">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">全选</span>
              </label>
            </div>

            {/* 项目列表 */}
            {filteredAndSortedProjects.map(project => (
              <div key={project.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectSelection(project.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          v{project.version}
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{project.nodes.length} 节点</span>
                        <span>{project.edges.length} 连接</span>
                        <span>更新于 {formatDate(project.updatedAt)}</span>
                      </div>

                      {project.metadata?.tags && project.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.metadata.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleLoadProject(project.id)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      打开
                    </button>
                    <button
                      onClick={() => handleDuplicateProject(project)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => handleExportProject(project.id)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700"
                    >
                      导出
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建项目弹窗 */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">新建项目</h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入项目名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目描述
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入项目描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目分类
                </label>
                <select
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">通用</option>
                  <option value="data-processing">数据处理</option>
                  <option value="web-crawling">网络爬虫</option>
                  <option value="monitoring">监控任务</option>
                  <option value="analytics">数据分析</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};