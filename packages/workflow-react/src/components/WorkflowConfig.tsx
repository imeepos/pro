import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';

interface WorkflowConfigProps {
  onSave?: (config: WorkflowConfig) => void;
}

interface WorkflowConfig {
  name: string;
  description: string;
  version: string;
  timeout: number;
  retryCount: number;
  parallelism: number;
  environment: Record<string, string>;
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  notifications?: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: string[];
    recipients: string[];
  };
}

export const WorkflowConfig = ({ onSave }: WorkflowConfigProps) => {
  const { workflowInfo, setState } = useWorkflowStore();

  const [config, setConfig] = useState<WorkflowConfig>({
    name: workflowInfo.name || 'Untitled Workflow',
    description: workflowInfo.description || '',
    version: workflowInfo.version || '1.0.0',
    timeout: 300000, // 5分钟
    retryCount: 3,
    parallelism: 4,
    environment: {},
    schedule: {
      enabled: false,
      cron: '0 0 * * *',
      timezone: 'Asia/Shanghai'
    },
    notifications: {
      onSuccess: false,
      onFailure: true,
      channels: ['email'],
      recipients: []
    }
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'notifications' | 'environment'>('basic');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  /**
   * 保存配置
   */
  const handleSave = () => {
    setState({
      workflowInfo: {
        name: config.name,
        description: config.description,
        version: config.version,
        updatedAt: new Date().toISOString()
      }
    });

    onSave?.(config);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  /**
   * 添加环境变量
   */
  const addEnvironmentVariable = () => {
    setConfig(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        '': ''
      }
    }));
  };

  /**
   * 更新环境变量
   */
  const updateEnvironmentVariable = (oldKey: string, newKey: string, value: string) => {
    setConfig(prev => {
      const newEnvironment = { ...prev.environment };
      delete newEnvironment[oldKey];
      newEnvironment[newKey] = value;
      return {
        ...prev,
        environment: newEnvironment
      };
    });
  };

  /**
   * 删除环境变量
   */
  const removeEnvironmentVariable = (key: string) => {
    setConfig(prev => {
      const newEnvironment = { ...prev.environment };
      delete newEnvironment[key];
      return {
        ...prev,
        environment: newEnvironment
      };
    });
  };

  /**
   * 添加通知接收者
   */
  const addRecipient = () => {
    const recipient = prompt('请输入接收者邮箱地址:');
    if (recipient) {
      setConfig(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications!,
          recipients: [...(prev.notifications?.recipients || []), recipient]
        }
      }));
    }
  };

  /**
   * 删除通知接收者
   */
  const removeRecipient = (index: number) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications!,
        recipients: prev.notifications?.recipients.filter((_, i) => i !== index) || []
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">工作流配置</h3>
          <div className="flex items-center space-x-2">
            {showSaveSuccess && (
              <span className="text-sm text-green-600">保存成功</span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex space-x-1 mt-4">
          {[
            { key: 'basic', label: '基本配置' },
            { key: 'schedule', label: '定时调度' },
            { key: 'notifications', label: '通知设置' },
            { key: 'environment', label: '环境变量' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 配置内容 */}
      <div className="p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                工作流名称
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入工作流名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                工作流描述
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入工作流描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  版本号
                </label>
                <input
                  type="text"
                  value={config.version}
                  onChange={(e) => setConfig({ ...config, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1.0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  超时时间 (秒)
                </label>
                <input
                  type="number"
                  value={config.timeout / 1000}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) * 1000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重试次数
                </label>
                <input
                  type="number"
                  value={config.retryCount}
                  onChange={(e) => setConfig({ ...config, retryCount: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  并行度
                </label>
                <input
                  type="number"
                  value={config.parallelism}
                  onChange={(e) => setConfig({ ...config, parallelism: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="schedule-enabled"
                checked={config.schedule?.enabled}
                onChange={(e) => setConfig({
                  ...config,
                  schedule: { ...config.schedule!, enabled: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="schedule-enabled" className="text-sm font-medium text-gray-700">
                启用定时调度
              </label>
            </div>

            {config.schedule?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cron 表达式
                  </label>
                  <input
                    type="text"
                    value={config.schedule.cron}
                    onChange={(e) => setConfig({
                      ...config,
                      schedule: { ...config.schedule!, cron: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0 0 * * *"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    格式: 分 时 日 月 星期 (例如: 0 0 * * * 表示每天零点执行)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时区
                  </label>
                  <select
                    value={config.schedule.timezone}
                    onChange={(e) => setConfig({
                      ...config,
                      schedule: { ...config.schedule!, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="notify-success"
                  checked={config.notifications?.onSuccess}
                  onChange={(e) => setConfig({
                    ...config,
                    notifications: { ...config.notifications!, onSuccess: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notify-success" className="text-sm font-medium text-gray-700">
                  执行成功时通知
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="notify-failure"
                  checked={config.notifications?.onFailure}
                  onChange={(e) => setConfig({
                    ...config,
                    notifications: { ...config.notifications!, onFailure: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notify-failure" className="text-sm font-medium text-gray-700">
                  执行失败时通知
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                通知渠道
              </label>
              <div className="space-y-2">
                {['email', 'webhook', 'slack', 'dingtalk'].map(channel => (
                  <label key={channel} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.notifications?.channels.includes(channel)}
                      onChange={(e) => {
                        const channels = config.notifications?.channels || [];
                        if (e.target.checked) {
                          setConfig({
                            ...config,
                            notifications: {
                              ...config.notifications!,
                              channels: [...channels, channel]
                            }
                          });
                        } else {
                          setConfig({
                            ...config,
                            notifications: {
                              ...config.notifications!,
                              channels: channels.filter(c => c !== channel)
                            }
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  接收者
                </label>
                <button
                  type="button"
                  onClick={addRecipient}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + 添加接收者
                </button>
              </div>
              <div className="space-y-2">
                {config.notifications?.recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={recipient}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      删除
                    </button>
                  </div>
                ))}
                {config.notifications?.recipients.length === 0 && (
                  <div className="text-gray-500 text-sm">暂无接收者</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'environment' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                环境变量
              </label>
              <button
                type="button"
                onClick={addEnvironmentVariable}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 添加变量
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(config.environment).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateEnvironmentVariable(key, e.target.value, value)}
                    placeholder="变量名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateEnvironmentVariable(key, key, e.target.value)}
                    placeholder="变量值"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeEnvironmentVariable(key)}
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              ))}
              {Object.keys(config.environment).length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">
                  暂无环境变量，点击上方按钮添加
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">使用说明</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 环境变量可以在工作流执行时被节点访问</li>
                <li>• 支持敏感信息配置，如API密钥、数据库连接等</li>
                <li>•使用 ${'${变量名}'} 的格式在节点配置中引用</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};