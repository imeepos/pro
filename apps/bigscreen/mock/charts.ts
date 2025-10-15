/**
 * 图表API Mock数据 - 简化版测试
 */

import { MockMethod } from 'vite-plugin-mock';

// 根据时间范围生成不同的年龄分布数据
const generateAgeDistribution = (timeRange?: string) => {
  const multipliers = {
    today: 1,
    yesterday: 0.95,
    thisWeek: 7.2,
    lastWeek: 6.8,
    thisMonth: 31,
    lastMonth: 29,
    thisQuarter: 92,
    lastQuarter: 87,
    halfYear: 183,
    lastHalfYear: 178,
    thisYear: 370,
    lastYear: 355,
    all: 730,
  };
  
  const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
  const baseData = [
    { age: '18-25', value: 450, percentage: 25 },
    { age: '26-35', value: 680, percentage: 38 },
    { age: '36-45', value: 320, percentage: 18 },
    { age: '46-55', value: 200, percentage: 11 },
    { age: '56-65', value: 100, percentage: 6 },
    { age: '65+', value: 50, percentage: 3 }
  ];
  
  return baseData.map(item => ({
    ...item,
    value: Math.floor(item.value * multiplier * (0.85 + Math.random() * 0.3))
  }));
};

export default [
  {
    url: '/api/charts/age-distribution',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      
      return {
        success: true,
        data: generateAgeDistribution(timeRange),
        timestamp: Date.now(),
      };
    },
  },
  
  {
    url: '/api/charts/gender-distribution',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      const multipliers = {
        today: 1,
        yesterday: 0.95,
        thisWeek: 7.2,
        lastWeek: 6.8,
        thisMonth: 31,
        lastMonth: 29,
        thisQuarter: 92,
        lastQuarter: 87,
        halfYear: 183,
        lastHalfYear: 178,
        thisYear: 370,
        lastYear: 355,
        all: 730,
      };
      
      const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
      const baseData = [
        { name: '女性', value: 1200, percentage: 52, color: '#ec4899' },
        { name: '男性', value: 980, percentage: 42, color: '#3b82f6' },
        { name: '未知', value: 120, percentage: 6, color: '#6b7280' }
      ];
      
      return {
        success: true,
        data: baseData.map(item => ({
          ...item,
          value: Math.floor(item.value * multiplier * (0.85 + Math.random() * 0.3))
        })),
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/sentiment-data',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      const multipliers = {
        today: 1,
        yesterday: 0.95,
        thisWeek: 7.2,
        lastWeek: 6.8,
        thisMonth: 31,
        lastMonth: 29,
        thisQuarter: 92,
        lastQuarter: 87,
        halfYear: 183,
        lastHalfYear: 178,
        thisYear: 370,
        lastYear: 355,
        all: 730,
      };
      
      const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
      const baseData = {
        positive: 6500,
        negative: 2100,
        neutral: 3400,
        total: 12000
      };
      
      return {
        success: true,
        data: {
          positive: Math.floor(baseData.positive * multiplier * (0.85 + Math.random() * 0.3)),
          negative: Math.floor(baseData.negative * multiplier * (0.85 + Math.random() * 0.3)),
          neutral: Math.floor(baseData.neutral * multiplier * (0.85 + Math.random() * 0.3)),
          total: Math.floor(baseData.total * multiplier * (0.85 + Math.random() * 0.3))
        },
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/sentiment-trend',
    method: 'get',
    response: () => {
      const now = new Date();
      const data = Array.from({ length: 24 }, (_, index) => {
        const timestamp = new Date(now.getTime() - (23 - index) * 60 * 60 * 1000);
        return {
          timestamp: timestamp.toISOString(),
          positive: Math.floor(Math.random() * 20) + 40,
          negative: Math.floor(Math.random() * 10) + 15,
          neutral: Math.floor(Math.random() * 15) + 35,
        };
      });

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/geographic',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      const multipliers = {
        today: 1,
        yesterday: 0.95,
        thisWeek: 7.2,
        lastWeek: 6.8,
        thisMonth: 31,
        lastMonth: 29,
        thisQuarter: 92,
        lastQuarter: 87,
        halfYear: 183,
        lastHalfYear: 178,
        thisYear: 370,
        lastYear: 355,
        all: 730,
      };
      
      const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
      const baseData = [
        { name: '北京', value: 650, coordinates: [116.4074, 39.9042] },
        { name: '上海', value: 780, coordinates: [121.4737, 31.2304] },
        { name: '广州', value: 520, coordinates: [113.2644, 23.1291] },
        { name: '深圳', value: 480, coordinates: [114.0579, 22.5431] },
        { name: '杭州', value: 320, coordinates: [120.1551, 30.2741] }
      ];
      
      return {
        success: true,
        data: baseData.map(item => ({
          ...item,
          value: Math.floor(item.value * multiplier * (0.85 + Math.random() * 0.3))
        })),
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/event-types',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      const multipliers = {
        today: 1,
        yesterday: 0.95,
        thisWeek: 7.2,
        lastWeek: 6.8,
        thisMonth: 31,
        lastMonth: 29,
        thisQuarter: 92,
        lastQuarter: 87,
        halfYear: 183,
        lastHalfYear: 178,
        thisYear: 370,
        lastYear: 355,
        all: 730,
      };
      
      const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
      const baseData = [
        { type: '社会热点', count: 425, percentage: 35.4, color: '#3b82f6' },
        { type: '科技创新', count: 300, percentage: 25.0, color: '#10b981' },
        { type: '政策法规', count: 240, percentage: 20.0, color: '#f59e0b' },
        { type: '经济财经', count: 180, percentage: 15.0, color: '#ef4444' },
        { type: '文体娱乐', count: 55, percentage: 4.6, color: '#8b5cf6' }
      ];
      
      return {
        success: true,
        data: baseData.map(item => ({
          ...item,
          count: Math.floor(item.count * multiplier * (0.85 + Math.random() * 0.3))
        })),
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/word-cloud',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: [
          { keyword: '人工智能', count: 1250, weight: 1250, sentiment: 'positive' },
          { keyword: '机器学习', count: 980, weight: 980, sentiment: 'positive' },
          { keyword: '深度学习', count: 750, weight: 750, sentiment: 'neutral' },
          { keyword: '大数据', count: 620, weight: 620, sentiment: 'positive' },
          { keyword: '云计算', count: 580, weight: 580, sentiment: 'positive' }
        ],
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/event-count-series',
    method: 'get',
    response: () => {
      const dates = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dates.push({
          timestamp: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 50) + 100,
          label: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        });
      }

      return {
        success: true,
        data: dates,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/post-count-series',
    method: 'get',
    response: () => {
      const dates = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dates.push({
          timestamp: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 300) + 700,
          label: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        });
      }

      return {
        success: true,
        data: dates,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/charts/batch',
    method: 'get',
    response: ({ query }: any) => {
      const types = query?.types as string;
      const chartTypes = types?.split(',') || [];
      
      const data: Record<string, unknown> = {};
      
      if (chartTypes.includes('age')) {
        data.ageDistribution = [
          { age: '18-25', value: 450, percentage: 25 },
          { age: '26-35', value: 680, percentage: 38 }
        ];
      }
      if (chartTypes.includes('gender')) {
        data.genderDistribution = [
          { name: '女性', value: 1200, percentage: 52, color: '#ec4899' },
          { name: '男性', value: 980, percentage: 42, color: '#3b82f6' }
        ];
      }
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/events/hot-list',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: [
          {
            id: '1',
            title: '某明星恋情曝光引发网友热议',
            postCount: 15420,
            sentiment: { positive: 65, negative: 20, neutral: 15 },
            hotness: 95,
            trend: 'up',
            trendData: [45, 52, 48, 61, 78, 89, 95]
          },
          {
            id: '2',
            title: '新能源汽车政策发布',
            postCount: 8760,
            sentiment: { positive: 45, negative: 35, neutral: 20 },
            hotness: 78,
            trend: 'stable',
            trendData: [72, 75, 78, 76, 79, 77, 78]
          },
          {
            id: '3',
            title: '科技公司裁员消息',
            postCount: 12340,
            sentiment: { positive: 15, negative: 70, neutral: 15 },
            hotness: 85,
            trend: 'down',
            trendData: [92, 89, 87, 85, 83, 84, 85]
          }
        ],
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];