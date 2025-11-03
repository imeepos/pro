// import type { NodeBlueprint } from '../types/canvas';

/**
 * 工作流模板定义
 * 每个模板代表一个完整的业务场景，包含预配置的节点和连接
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data-processing' | 'web-crawling' | 'monitoring' | 'analytics' | 'automation';
  tags: string[];
  blueprint: {
    nodes: Array<{
      id: string;
      blueprintId: string;
      position: { x: number; y: number };
      config: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
      data?: Record<string, unknown>;
    }>;
  };
}

/**
 * 数据处理工作流模板
 */
export const dataProcessingTemplates: WorkflowTemplate[] = [
  {
    id: 'csv-processor',
    name: 'CSV 数据处理流程',
    description: '读取 CSV 文件，进行数据清洗和转换，输出到数据库',
    category: 'data-processing',
    tags: ['csv', 'data', 'transformation'],
    blueprint: {
      nodes: [
        {
          id: 'csv-reader',
          blueprintId: 'FileReaderAst',
          position: { x: 100, y: 100 },
          config: {
            filePath: '/data/input.csv',
            format: 'csv',
            encoding: 'utf-8'
          }
        },
        {
          id: 'data-validator',
          blueprintId: 'DataValidatorAst',
          position: { x: 350, y: 100 },
          config: {
            rules: [
              { field: 'email', type: 'email', required: true },
              { field: 'age', type: 'number', min: 0, max: 150 }
            ]
          }
        },
        {
          id: 'data-transformer',
          blueprintId: 'DataTransformerAst',
          position: { x: 600, y: 100 },
          config: {
            transformations: [
              { field: 'name', operation: 'upper' },
              { field: 'date', operation: 'format', params: { format: 'YYYY-MM-DD' } }
            ]
          }
        },
        {
          id: 'database-writer',
          blueprintId: 'DatabaseWriterAst',
          position: { x: 850, y: 100 },
          config: {
            connectionString: 'postgresql://localhost:5432/prodb',
            table: 'processed_data',
            batchSize: 1000
          }
        }
      ],
      edges: [
        { source: 'csv-reader', target: 'data-validator', sourceHandle: 'output', targetHandle: 'input' },
        { source: 'data-validator', target: 'data-transformer', sourceHandle: 'valid', targetHandle: 'input' },
        { source: 'data-transformer', target: 'database-writer', sourceHandle: 'output', targetHandle: 'input' }
      ]
    }
  },
  {
    id: 'json-processor',
    name: 'JSON 数据聚合分析',
    description: '从多个 API 获取 JSON 数据，进行聚合分析和可视化',
    category: 'data-processing',
    tags: ['json', 'api', 'aggregation'],
    blueprint: {
      nodes: [
        {
          id: 'api-client-1',
          blueprintId: 'ApiClientAst',
          position: { x: 100, y: 50 },
          config: {
            url: 'https://api.example.com/users',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ${API_TOKEN}' }
          }
        },
        {
          id: 'api-client-2',
          blueprintId: 'ApiClientAst',
          position: { x: 100, y: 200 },
          config: {
            url: 'https://api.example.com/orders',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ${API_TOKEN}' }
          }
        },
        {
          id: 'data-merger',
          blueprintId: 'DataMergerAst',
          position: { x: 400, y: 125 },
          config: {
            strategy: 'join',
            joinKey: 'user_id'
          }
        },
        {
          id: 'aggregator',
          blueprintId: 'DataAggregatorAst',
          position: { x: 650, y: 125 },
          config: {
            groupBy: ['department'],
            aggregations: [
              { field: 'revenue', operation: 'sum' },
              { field: 'orders', operation: 'count' }
            ]
          }
        },
        {
          id: 'chart-generator',
          blueprintId: 'ChartGeneratorAst',
          position: { x: 900, y: 125 },
          config: {
            type: 'bar',
            title: '部门收入统计',
            xAxis: 'department',
            yAxis: 'revenue'
          }
        }
      ],
      edges: [
        { source: 'api-client-1', target: 'data-merger', sourceHandle: 'response', targetHandle: 'input1' },
        { source: 'api-client-2', target: 'data-merger', sourceHandle: 'response', targetHandle: 'input2' },
        { source: 'data-merger', target: 'aggregator', sourceHandle: 'merged', targetHandle: 'input' },
        { source: 'aggregator', target: 'chart-generator', sourceHandle: 'aggregated', targetHandle: 'data' }
      ]
    }
  }
];

/**
 * 网络爬虫工作流模板
 */
export const webCrawlingTemplates: WorkflowTemplate[] = [
  {
    id: 'ecommerce-scraper',
    name: '电商产品爬虫',
    description: '爬取电商网站产品信息，存储到数据库并发送通知',
    category: 'web-crawling',
    tags: ['ecommerce', 'products', 'scraping'],
    blueprint: {
      nodes: [
        {
          id: 'url-seeder',
          blueprintId: 'UrlSeederAst',
          position: { x: 100, y: 100 },
          config: {
            urls: [
              'https://shop.example.com/electronics',
              'https://shop.example.com/clothing'
            ],
            pagination: true
          }
        },
        {
          id: 'playwright-crawler',
          blueprintId: 'PlaywrightCrawlerAst',
          position: { x: 350, y: 100 },
          config: {
            headless: true,
            timeout: 30000,
            selectors: {
              title: '.product-title',
              price: '.price',
              description: '.description'
            }
          }
        },
        {
          id: 'data-extractor',
          blueprintId: 'HtmlExtractorAst',
          position: { x: 600, y: 100 },
          config: {
            fields: [
              { name: 'title', selector: 'h1.product-title' },
              { name: 'price', selector: '.price', attribute: 'content' },
              { name: 'images', selector: '.product-image', attribute: 'src', multiple: true }
            ]
          }
        },
        {
          id: 'data-storage',
          blueprintId: 'MongoStorageAst',
          position: { x: 850, y: 100 },
          config: {
            connectionString: 'mongodb://localhost:27017/scraper',
            database: 'products',
            collection: 'items'
          }
        },
        {
          id: 'notification',
          blueprintId: 'EmailNotifierAst',
          position: { x: 1100, y: 100 },
          config: {
            to: 'admin@example.com',
            subject: '爬虫任务完成',
            template: 'crawl-complete'
          }
        }
      ],
      edges: [
        { source: 'url-seeder', target: 'playwright-crawler', sourceHandle: 'urls', targetHandle: 'urls' },
        { source: 'playwright-crawler', target: 'data-extractor', sourceHandle: 'page', targetHandle: 'html' },
        { source: 'data-extractor', target: 'data-storage', sourceHandle: 'data', targetHandle: 'documents' },
        { source: 'data-storage', target: 'notification', sourceHandle: 'result', targetHandle: 'data' }
      ]
    }
  },
  {
    id: 'news-monitor',
    name: '新闻监控爬虫',
    description: '监控新闻网站，抓取关键词相关新闻并分析情感倾向',
    category: 'web-crawling',
    tags: ['news', 'monitoring', 'sentiment'],
    blueprint: {
      nodes: [
        {
          id: 'keyword-seeder',
          blueprintId: 'KeywordSeederAst',
          position: { x: 100, y: 100 },
          config: {
            keywords: ['人工智能', 'AI', '机器学习'],
            searchEngines: ['baidu', 'google'],
            maxResults: 100
          }
        },
        {
          id: 'news-crawler',
          blueprintId: 'PlaywrightCrawlerAst',
          position: { x: 350, y: 100 },
          config: {
            headless: true,
            timeout: 20000,
            userAgent: 'Mozilla/5.0 (compatible; NewsBot/1.0)'
          }
        },
        {
          id: 'content-extractor',
          blueprintId: 'ContentExtractorAst',
          position: { x: 600, y: 100 },
          config: {
            extractTitle: true,
            extractContent: true,
            extractDate: true,
            extractAuthor: true
          }
        },
        {
          id: 'sentiment-analyzer',
          blueprintId: 'SentimentAnalyzerAst',
          position: { x: 850, y: 100 },
          config: {
            model: 'chinese-sentiment',
            threshold: 0.7
          }
        },
        {
          id: 'alert-filter',
          blueprintId: 'AlertFilterAst',
          position: { x: 1100, y: 100 },
          config: {
            conditions: [
              { field: 'sentiment', operator: 'lt', value: 0.3 },
              { field: 'containsUrgent', operator: 'eq', value: true }
            ]
          }
        }
      ],
      edges: [
        { source: 'keyword-seeder', target: 'news-crawler', sourceHandle: 'urls', targetHandle: 'urls' },
        { source: 'news-crawler', target: 'content-extractor', sourceHandle: 'page', targetHandle: 'html' },
        { source: 'content-extractor', target: 'sentiment-analyzer', sourceHandle: 'content', targetHandle: 'text' },
        { source: 'sentiment-analyzer', target: 'alert-filter', sourceHandle: 'sentiment', targetHandle: 'input' }
      ]
    }
  }
];

/**
 * 监控任务工作流模板
 */
export const monitoringTemplates: WorkflowTemplate[] = [
  {
    id: 'system-monitor',
    name: '系统性能监控',
    description: '监控系统资源使用情况，异常时发送告警',
    category: 'monitoring',
    tags: ['system', 'performance', 'alerting'],
    blueprint: {
      nodes: [
        {
          id: 'metrics-collector',
          blueprintId: 'MetricsCollectorAst',
          position: { x: 100, y: 100 },
          config: {
            metrics: ['cpu', 'memory', 'disk', 'network'],
            interval: 60,
            sources: ['local', 'prometheus']
          }
        },
        {
          id: 'threshold-checker',
          blueprintId: 'ThresholdCheckerAst',
          position: { x: 350, y: 100 },
          config: {
            thresholds: {
              cpu: { warning: 70, critical: 90 },
              memory: { warning: 80, critical: 95 },
              disk: { warning: 85, critical: 95 }
            }
          }
        },
        {
          id: 'alert-evaluator',
          blueprintId: 'AlertEvaluatorAst',
          position: { x: 600, y: 100 },
          config: {
            rules: [
              { condition: 'cpu > 90', severity: 'critical', cooldown: 300 },
              { condition: 'memory > 95', severity: 'critical', cooldown: 300 }
            ]
          }
        },
        {
          id: 'notification-sender',
          blueprintId: 'MultiChannelNotifierAst',
          position: { x: 850, y: 100 },
          config: {
            channels: ['email', 'slack', 'sms'],
            recipients: {
              email: ['admin@example.com'],
              slack: ['#alerts'],
              sms: ['+86xxxxxxxx']
            }
          }
        }
      ],
      edges: [
        { source: 'metrics-collector', target: 'threshold-checker', sourceHandle: 'metrics', targetHandle: 'metrics' },
        { source: 'threshold-checker', target: 'alert-evaluator', sourceHandle: 'violations', targetHandle: 'events' },
        { source: 'alert-evaluator', target: 'notification-sender', sourceHandle: 'alerts', targetHandle: 'notifications' }
      ]
    }
  }
];

/**
 * 所有工作流模板
 */
export const workflowTemplates = [
  ...dataProcessingTemplates,
  ...webCrawlingTemplates,
  ...monitoringTemplates
];

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return workflowTemplates.filter(template => template.category === category);
}

/**
 * 根据标签搜索模板
 */
export function searchTemplatesByTag(tag: string): WorkflowTemplate[] {
  return workflowTemplates.filter(template =>
    template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(template => template.id === id);
}