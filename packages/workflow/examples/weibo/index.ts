/**
 * 微博模块主入口
 * 提供微博相关功能的统一导出接口
 */

// 导出类型定义
export * from './types';

// 导出解析器
export { WeiboPostParser } from './parsers/post-parser';
export { WeiboPageParser } from './parsers/page-parser';
export { WeiboDetailParser } from './parsers/detail-parser';

// 导出访问者
export { WeiboVisitor } from './visitors/weibo-visitor';