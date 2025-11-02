import { WorkflowNodeBlueprint } from '../models/workflow-blueprint.model';

export const WORKFLOW_NODE_BLUEPRINTS: readonly WorkflowNodeBlueprint[] = [
  {
    kind: 'PLAYWRIGHT_FETCH',
    title: '浏览器采集',
    subtitle: '以 Playwright 捕获动态页面',
    accentColor: '#2563eb',
  },
  {
    kind: 'ACCOUNT_INJECTOR',
    title: '账号注入',
    subtitle: '挂载受控账号上下文',
    accentColor: '#0f766e',
  },
  {
    kind: 'WEIBO_KEYWORD_SEARCH',
    title: '关键词检索',
    subtitle: '搜索微博热点',
    accentColor: '#dc2626',
  },
  {
    kind: 'WEIBO_SEARCH_URL_BUILDER',
    title: '搜索 URL 构建',
    subtitle: '生成分页入口',
    accentColor: '#f97316',
  },
  {
    kind: 'WEIBO_DETAIL_FETCH',
    title: '微博详情',
    subtitle: '拉取原文与元数据',
    accentColor: '#7c3aed',
  },
  {
    kind: 'WEIBO_USER_PROFILE',
    title: '用户画像',
    subtitle: '补全作者信息',
    accentColor: '#6d28d9',
  },
  {
    kind: 'WEIBO_COMMENTS',
    title: '评论采集',
    subtitle: '分页收集评论',
    accentColor: '#0891b2',
  },
  {
    kind: 'WEIBO_LIKES',
    title: '点赞采集',
    subtitle: '记录互动用户',
    accentColor: '#16a34a',
  },
  {
    kind: 'WEIBO_SHARES',
    title: '转发采集',
    subtitle: '追踪传播路径',
    accentColor: '#ea580c',
  },
  {
    kind: 'WEIBO_AJAX_STATUSES_SHOW',
    title: '微博原文',
    subtitle: '获取详情主体',
    accentColor: '#9333ea',
  },
  {
    kind: 'WEIBO_AJAX_STATUSES_REPOST_TIMELINE',
    title: '转发时间线',
    subtitle: '读取扩散链路',
    accentColor: '#f59e0b',
  },
  {
    kind: 'WEIBO_AJAX_STATUSES_MYMBLOG',
    title: '用户微博流',
    subtitle: '拉取时间轴',
    accentColor: '#ec4899',
  },
  {
    kind: 'WEIBO_AJAX_STATUSES_LIKE_SHOW',
    title: '点赞用户录',
    subtitle: '挖掘互动圈层',
    accentColor: '#10b981',
  },
  {
    kind: 'WEIBO_AJAX_STATUSES_COMMENT',
    title: '评论互动',
    subtitle: '捕获对话流',
    accentColor: '#06b6d4',
  },
  {
    kind: 'WEIBO_AJAX_PROFILE_INFO',
    title: '身份档案',
    subtitle: '解析用户元信息',
    accentColor: '#8b5cf6',
  },
  {
    kind: 'MQ_PUBLISH',
    title: '事件广播',
    subtitle: '投递消息到队列',
    accentColor: '#1d4ed8',
  },
  {
    kind: 'STORAGE_SINK',
    title: '持久化',
    subtitle: '落盘原始数据',
    accentColor: '#334155',
  },
] as const;
