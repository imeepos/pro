/**
 * 用户检测API Mock数据
 */

import { MockMethod } from 'vite-plugin-mock';

export default [
  {
    url: '/api/users/list',
    method: 'get',
    response: ({ query }: any) => {
      const riskLevel = query?.riskLevel as string;
      const search = query?.search as string;
      const limit = query?.limit ? parseInt(query.limit) : undefined;

      let users = [
        {
          id: '1',
          username: 'user123',
          nickname: '热心网友',
          followers: 15420,
          following: 892,
          posts: 1234,
          verified: true,
          location: '北京市',
          riskLevel: 'low',
          activities: { posts: 45, comments: 128 },
          sentiment: { positive: 70, negative: 15, neutral: 15 },
          tags: ['活跃用户', '正面情绪', '意见领袖'],
          lastActive: '2024-01-15T16:30:00Z'
        },
        {
          id: '2',
          username: 'suspicious_user',
          nickname: '匿名用户',
          followers: 23,
          following: 1500,
          posts: 89,
          verified: false,
          location: '未知',
          riskLevel: 'high',
          activities: { posts: 156, comments: 234 },
          sentiment: { positive: 10, negative: 80, neutral: 10 },
          tags: ['新用户', '负面情绪', '异常行为'],
          lastActive: '2024-01-15T15:45:00Z'
        },
        {
          id: '3',
          username: 'normal_user',
          nickname: '普通用户',
          followers: 456,
          following: 234,
          posts: 567,
          verified: false,
          location: '上海市',
          riskLevel: 'medium',
          activities: { posts: 23, comments: 67 },
          sentiment: { positive: 45, negative: 35, neutral: 20 },
          tags: ['普通用户', '中性情绪'],
          lastActive: '2024-01-15T14:20:00Z'
        },
        {
          id: '4',
          username: 'tech_expert',
          nickname: '科技达人',
          followers: 8900,
          following: 456,
          posts: 2100,
          verified: true,
          location: '深圳市',
          riskLevel: 'low',
          activities: { posts: 78, comments: 245 },
          sentiment: { positive: 85, negative: 5, neutral: 10 },
          tags: ['专业用户', '科技', '正面情绪'],
          lastActive: '2024-01-15T17:10:00Z'
        },
        {
          id: '5',
          username: 'news_spreader',
          nickname: '消息传播者',
          followers: 123,
          following: 2300,
          posts: 45,
          verified: false,
          location: '广州市',
          riskLevel: 'medium',
          activities: { posts: 89, comments: 156 },
          sentiment: { positive: 30, negative: 50, neutral: 20 },
          tags: ['传播用户', '消息传播'],
          lastActive: '2024-01-15T13:45:00Z'
        }
      ];

      // 按风险等级筛选
      if (riskLevel && riskLevel !== 'all') {
        users = users.filter(user => user.riskLevel === riskLevel);
      }

      // 按搜索词筛选
      if (search) {
        const searchTerm = search.toLowerCase();
        users = users.filter(user => 
          user.username.toLowerCase().includes(searchTerm) ||
          user.nickname.toLowerCase().includes(searchTerm)
        );
      }

      // 限制数量
      if (limit) {
        users = users.slice(0, limit);
      }

      return {
        success: true,
        data: users,
        total: users.length,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/users/risk-levels',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: {
          levels: ['all', 'high', 'medium', 'low'],
          labels: {
            all: '全部',
            high: '高风险',
            medium: '中风险',
            low: '低风险'
          }
        },
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/users/statistics',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: {
          total: 5,
          high: 1,
          medium: 2,
          low: 2
        },
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];