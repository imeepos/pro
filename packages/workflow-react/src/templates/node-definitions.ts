import type { NodeBlueprint } from '../types/canvas';

/**
 * 扩展节点蓝图定义
 * 为前端UI提供更丰富的节点类型和配置选项
 */
export const extendedNodeBlueprints: Record<string, NodeBlueprint> = {
  // 数据输入节点
  'FileReaderAst': {
    id: 'FileReaderAst',
    name: '文件读取器',
    category: '数据输入',
    description: '从本地文件系统读取数据文件',
    icon: '📁',
    ports: {
      input: [],
      output: [
        { id: 'data', name: '数据', kind: 'data', dataType: 'array' },
        { id: 'metadata', name: '元数据', kind: 'data', dataType: 'object' }
      ]
    },
    configSchema: {
      filePath: { type: 'string', label: '文件路径', required: true },
      format: { type: 'select', label: '文件格式', options: ['csv', 'json', 'xml', 'excel'], default: 'csv' },
      encoding: { type: 'select', label: '编码格式', options: ['utf-8', 'gbk', 'ascii'], default: 'utf-8' },
      hasHeader: { type: 'boolean', label: '包含表头', default: true },
      delimiter: { type: 'string', label: '分隔符', default: ',' }
    }
  },

  // API客户端节点
  'ApiClientAst': {
    id: 'ApiClientAst',
    name: 'API客户端',
    category: '数据输入',
    description: '发送HTTP请求获取远程数据',
    icon: '🌐',
    ports: {
      input: [
        { id: 'params', name: '请求参数', kind: 'data', dataType: 'object', required: false }
      ],
      output: [
        { id: 'response', name: '响应数据', kind: 'data', dataType: 'any' },
        { id: 'status', name: '状态码', kind: 'data', dataType: 'number' },
        { id: 'error', name: '错误信息', kind: 'data', dataType: 'string' }
      ]
    },
    configSchema: {
      url: { type: 'string', label: '请求URL', required: true },
      method: { type: 'select', label: '请求方法', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      headers: { type: 'object', label: '请求头', default: {} },
      timeout: { type: 'number', label: '超时时间(秒)', default: 30 },
      retryCount: { type: 'number', label: '重试次数', default: 3 }
    }
  },

  // 数据转换节点
  'DataTransformerAst': {
    id: 'DataTransformerAst',
    name: '数据转换器',
    category: '数据处理',
    description: '对数据进行格式转换和字段映射',
    icon: '🔄',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'output', name: '输出数据', kind: 'data', dataType: 'array' },
        { id: 'errors', name: '转换错误', kind: 'data', dataType: 'array' }
      ]
    },
    configSchema: {
      transformations: { type: 'array', label: '转换规则', required: true },
      filterConditions: { type: 'object', label: '过滤条件', required: false },
      sortBy: { type: 'object', label: '排序规则', required: false },
      limit: { type: 'number', label: '记录数限制', required: false }
    }
  },

  // 数据验证节点
  'DataValidatorAst': {
    id: 'DataValidatorAst',
    name: '数据验证器',
    category: '数据处理',
    description: '验证数据格式和业务规则',
    icon: '✅',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'valid', name: '有效数据', kind: 'data', dataType: 'array' },
        { id: 'invalid', name: '无效数据', kind: 'data', dataType: 'array' },
        { id: 'errors', name: '验证报告', kind: 'data', dataType: 'array' }
      ]
    },
    configSchema: {
      rules: { type: 'array', label: '验证规则', required: true },
      strictMode: { type: 'boolean', label: '严格模式', default: false },
      stopOnFirstError: { type: 'boolean', label: '遇到错误时停止', default: false }
    }
  },

  // 数据聚合节点
  'DataAggregatorAst': {
    id: 'DataAggregatorAst',
    name: '数据聚合器',
    category: '数据分析',
    description: '对数据进行分组聚合计算',
    icon: '📊',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'aggregated', name: '聚合结果', kind: 'data', dataType: 'array' },
        { id: 'statistics', name: '统计信息', kind: 'data', dataType: 'object' }
      ]
    },
    configSchema: {
      groupBy: { type: 'array', label: '分组字段', required: true },
      aggregations: { type: 'array', label: '聚合函数', required: true },
      filters: { type: 'object', label: '过滤条件', required: false }
    }
  },

  // 爬虫节点
  'PlaywrightCrawlerAst': {
    id: 'PlaywrightCrawlerAst',
    name: '浏览器爬虫',
    category: '网络爬虫',
    description: '使用Playwright进行网页数据抓取',
    icon: '🕷️',
    ports: {
      input: [
        { id: 'urls', name: '目标URL', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'page', name: '页面内容', kind: 'data', dataType: 'object' },
        { id: 'screenshot', name: '截图', kind: 'data', dataType: 'string' },
        { id: 'error', name: '错误信息', kind: 'data', dataType: 'string' }
      ]
    },
    configSchema: {
      headless: { type: 'boolean', label: '无头模式', default: true },
      timeout: { type: 'number', label: '超时时间(毫秒)', default: 30000 },
      userAgent: { type: 'string', label: '用户代理', required: false },
      viewport: { type: 'object', label: '视窗大小', default: { width: 1920, height: 1080 } },
      waitForSelector: { type: 'string', label: '等待选择器', required: false },
      screenshot: { type: 'boolean', label: '启用截图', default: false }
    }
  },

  // HTML提取节点
  'HtmlExtractorAst': {
    id: 'HtmlExtractorAst',
    name: 'HTML提取器',
    category: '网络爬虫',
    description: '从HTML内容中提取结构化数据',
    icon: '🏷️',
    ports: {
      input: [
        { id: 'html', name: 'HTML内容', kind: 'data', dataType: 'string', required: true }
      ],
      output: [
        { id: 'data', name: '提取数据', kind: 'data', dataType: 'array' },
        { id: 'metadata', name: '提取元数据', kind: 'data', dataType: 'object' }
      ]
    },
    configSchema: {
      fields: { type: 'array', label: '提取字段', required: true },
      baseUrl: { type: 'string', label: '基础URL', required: false },
      removeTags: { type: 'array', label: '移除标签', default: ['script', 'style'] },
      cleanWhitespace: { type: 'boolean', label: '清理空白字符', default: true }
    }
  },

  // 数据库操作节点
  'DatabaseWriterAst': {
    id: 'DatabaseWriterAst',
    name: '数据库写入器',
    category: '数据输出',
    description: '将数据写入关系型数据库',
    icon: '💾',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'result', name: '写入结果', kind: 'data', dataType: 'object' },
        { id: 'error', name: '错误信息', kind: 'data', dataType: 'string' }
      ]
    },
    configSchema: {
      connectionString: { type: 'string', label: '连接字符串', required: true },
      table: { type: 'string', label: '目标表名', required: true },
      operation: { type: 'select', label: '操作类型', options: ['insert', 'upsert', 'update'], default: 'insert' },
      batchSize: { type: 'number', label: '批次大小', default: 1000 },
      conflictStrategy: { type: 'select', label: '冲突策略', options: ['ignore', 'update', 'error'], default: 'ignore' }
    }
  },

  // 通知节点
  'EmailNotifierAst': {
    id: 'EmailNotifierAst',
    name: '邮件通知器',
    category: '通知输出',
    description: '发送邮件通知',
    icon: '📧',
    ports: {
      input: [
        { id: 'data', name: '通知数据', kind: 'data', dataType: 'object', required: false }
      ],
      output: [
        { id: 'sent', name: '发送状态', kind: 'data', dataType: 'boolean' },
        { id: 'error', name: '错误信息', kind: 'data', dataType: 'string' }
      ]
    },
    configSchema: {
      to: { type: 'array', label: '收件人', required: true },
      cc: { type: 'array', label: '抄送', required: false },
      subject: { type: 'string', label: '邮件主题', required: true },
      template: { type: 'select', label: '邮件模板', options: ['default', 'alert', 'report'], default: 'default' },
      attachments: { type: 'array', label: '附件', required: false }
    }
  },

  // 条件分支节点
  'ConditionalBranchAst': {
    id: 'ConditionalBranchAst',
    name: '条件分支',
    category: '控制流程',
    description: '根据条件执行不同的分支',
    icon: '🔀',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'any', required: true }
      ],
      output: [
        { id: 'true', name: '满足条件', kind: 'control', dataType: 'any' },
        { id: 'false', name: '不满足条件', kind: 'control', dataType: 'any' }
      ]
    },
    configSchema: {
      condition: { type: 'string', label: '条件表达式', required: true },
      language: { type: 'select', label: '表达式语言', options: ['javascript', 'jsonpath', 'spel'], default: 'javascript' }
    }
  },

  // 循环节点
  'LoopIteratorAst': {
    id: 'LoopIteratorAst',
    name: '循环迭代器',
    category: '控制流程',
    description: '对数组中的每个元素执行操作',
    icon: '🔁',
    ports: {
      input: [
        { id: 'array', name: '输入数组', kind: 'data', dataType: 'array', required: true }
      ],
      output: [
        { id: 'item', name: '当前元素', kind: 'data', dataType: 'any' },
        { id: 'index', name: '索引', kind: 'data', dataType: 'number' },
        { id: 'completed', name: '完成信号', kind: 'control', dataType: 'boolean' }
      ]
    },
    configSchema: {
      maxIterations: { type: 'number', label: '最大迭代次数', required: false },
      breakCondition: { type: 'string', label: '中断条件', required: false },
      parallel: { type: 'boolean', label: '并行执行', default: false },
      concurrency: { type: 'number', label: '并发数', default: 1 }
    }
  },

  // 延时节点
  'DelayAst': {
    id: 'DelayAst',
    name: '延时器',
    category: '控制流程',
    description: '延迟执行后续节点',
    icon: '⏰',
    ports: {
      input: [
        { id: 'input', name: '输入数据', kind: 'data', dataType: 'any', required: false }
      ],
      output: [
        { id: 'output', name: '输出数据', kind: 'data', dataType: 'any' }
      ]
    },
    configSchema: {
      delayMs: { type: 'number', label: '延时(毫秒)', required: true },
      randomDelay: { type: 'boolean', label: '随机延时', default: false },
      variance: { type: 'number', label: '变化范围(百分比)', default: 10 }
    }
  }
};

/**
 * 获取所有扩展节点蓝图
 */
export function getAllExtendedBlueprints(): Record<string, NodeBlueprint> {
  return extendedNodeBlueprints;
}

/**
 * 根据分类获取节点蓝图
 */
export function getBlueprintsByCategory(category: string): Record<string, NodeBlueprint> {
  const result: Record<string, NodeBlueprint> = {};

  Object.entries(extendedNodeBlueprints).forEach(([id, blueprint]) => {
    if (blueprint.category === category) {
      result[id] = blueprint;
    }
  });

  return result;
}

/**
 * 获取所有分类
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();

  Object.values(extendedNodeBlueprints).forEach(blueprint => {
    categories.add(blueprint.category);
  });

  return Array.from(categories).sort();
}