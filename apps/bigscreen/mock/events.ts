/**
 * 事件分析API Mock数据
 */

import { MockMethod } from 'vite-plugin-mock';

export default [
  {
    url: '/api/events/list',
    method: 'get',
    response: ({ query }: any) => {
      const category = query?.category as string;
      const search = query?.search as string;
      const limit = query?.limit ? parseInt(query.limit) : undefined;

      let events = [
        {
          id: '1',
          title: '某明星恋情曝光',
          description: '知名艺人公开恋情，引发网友热议',
          postCount: 15420,
          userCount: 8930,
          sentiment: { positive: 65, negative: 20, neutral: 15 },
          hotness: 95,
          trend: 'up',
          category: '娱乐',
          keywords: ['恋情', '明星', '公开', '祝福'],
          createdAt: '2024-01-15T10:30:00Z',
          lastUpdate: '2024-01-15T15:45:00Z',
          trendData: [45, 52, 48, 61, 78, 89, 95]
        },
        {
          id: '2',
          title: '新能源汽车政策发布',
          description: '政府发布新能源汽车补贴新政策',
          postCount: 8760,
          userCount: 5420,
          sentiment: { positive: 45, negative: 35, neutral: 20 },
          hotness: 78,
          trend: 'stable',
          category: '政策',
          keywords: ['新能源', '汽车', '政策', '补贴'],
          createdAt: '2024-01-15T09:15:00Z',
          lastUpdate: '2024-01-15T14:20:00Z',
          trendData: [72, 75, 78, 76, 79, 77, 78]
        },
        {
          id: '3',
          title: '科技公司裁员消息',
          description: '某知名科技公司宣布大规模裁员',
          postCount: 12340,
          userCount: 7650,
          sentiment: { positive: 15, negative: 70, neutral: 15 },
          hotness: 85,
          trend: 'down',
          category: '科技',
          keywords: ['裁员', '科技', '公司', '就业'],
          createdAt: '2024-01-15T08:00:00Z',
          lastUpdate: '2024-01-15T16:10:00Z',
          trendData: [92, 89, 87, 85, 83, 84, 85]
        },
        {
          id: '4',
          title: '体育赛事精彩瞬间',
          description: '重要体育赛事出现精彩瞬间',
          postCount: 6780,
          userCount: 4320,
          sentiment: { positive: 80, negative: 10, neutral: 10 },
          hotness: 72,
          trend: 'up',
          category: '体育',
          keywords: ['体育', '赛事', '精彩', '运动'],
          createdAt: '2024-01-15T11:00:00Z',
          lastUpdate: '2024-01-15T16:30:00Z',
          trendData: [45, 50, 58, 65, 70, 72, 75]
        },
        {
          id: '5',
          title: '社会公益活动启动',
          description: '大型社会公益活动正式启动',
          postCount: 4560,
          userCount: 3210,
          sentiment: { positive: 90, negative: 5, neutral: 5 },
          hotness: 68,
          trend: 'stable',
          category: '社会',
          keywords: ['公益', '社会', '活动', '爱心'],
          createdAt: '2024-01-15T12:30:00Z',
          lastUpdate: '2024-01-15T17:00:00Z',
          trendData: [60, 62, 65, 68, 68, 67, 68]
        }
      ];

      // 按分类筛选
      if (category && category !== 'all') {
        events = events.filter(event => event.category === category);
      }

      // 按搜索词筛选
      if (search) {
        const searchTerm = search.toLowerCase();
        events = events.filter(event => 
          event.title.toLowerCase().includes(searchTerm) ||
          event.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
        );
      }

      // 限制数量
      if (limit) {
        events = events.slice(0, limit);
      }

      return {
        success: true,
        data: events,
        total: events.length,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/events/categories',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: ['all', '娱乐', '政策', '科技', '体育', '社会', '经济'],
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/events/trend-data',
    method: 'get',
    response: () => {
      const generateTrendData = (baseValue: number, variance: number = 0.1) => {
        return Array.from({ length: 7 }, (_) => {
          const randomFactor = 1 + (Math.random() - 0.5) * variance;
          return Math.round(baseValue * randomFactor);
        });
      };

      return {
        success: true,
        data: {
          eventTrendData: generateTrendData(5, 0.2),
          postTrendData: generateTrendData(50000, 0.3),
          userTrendData: generateTrendData(25000, 0.25),
          hotnessData: generateTrendData(80, 0.15)
        },
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/events/:id',
    method: 'get',
    response: ({ query }: any) => {
      const eventId = query.id || '1';
      
      // 这里简化处理，实际应该根据ID返回对应事件详情
      return {
        success: true,
        data: {
          id: eventId,
          title: '某明星恋情曝光引发网友热议',
          description: '知名艺人公开恋情，引发网友热议，相关话题迅速登上热搜榜首',
          postCount: 15420,
          userCount: 8930,
          sentiment: { positive: 65, negative: 20, neutral: 15 },
          hotness: 95,
          trend: 'up',
          category: '娱乐',
          keywords: ['恋情', '明星', '公开', '祝福', '热搜', '娱乐圈'],
          createdAt: '2024-01-15T10:30:00Z',
          lastUpdate: '2024-01-15T15:45:00Z',
          trendData: [45, 52, 48, 61, 78, 89, 95]
        },
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];