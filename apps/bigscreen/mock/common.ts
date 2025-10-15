/**
 * 通用Mock数据接口
 */

import { MockMethod } from 'vite-plugin-mock';

export default [
  // 趋势数据接口
  {
    url: '/api/common/trend-data',
    method: 'get',
    response: ({ query }: any) => {
      const points = parseInt(query?.points) || 7;
      const baseValue = parseInt(query?.baseValue) || 100;
      const variance = parseInt(query?.variance) || 50;
      
      const data = Array.from({ length: points }, () => 
        Math.max(0, baseValue + Math.floor(Math.random() * (variance * 2 + 1)) - variance)
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    },
  },

  // 情感曲线数据接口
  {
    url: '/api/common/emotion-curve',
    method: 'get',
    response: ({ query }: any) => {
      const points = parseInt(query?.points) || 7;
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
      
      const generateTrendData = (points: number, baseValue: number, variance: number): number[] => {
        return Array.from({ length: points }, () => 
          Math.max(0, baseValue + Math.floor(Math.random() * (variance * 2 + 1)) - variance)
        );
      };

      return {
        success: true,
        data: {
          hours: hours.slice(0, points),
          positiveData: generateTrendData(points, 400, 200),
          negativeData: generateTrendData(points, 200, 100),
          neutralData: generateTrendData(points, 350, 150)
        },
        timestamp: Date.now(),
      };
    },
  },

  // 日期序列数据接口
  {
    url: '/api/common/date-series',
    method: 'get',
    response: ({ query }: any) => {
      const days = parseInt(query?.days) || 7;
      const result = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        result.push({
          date: dateStr,
          count: Math.floor(Math.random() * 151) + 100 // random(100, 250)
        });
      }

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    },
  },

  // 情感饼图数据接口
  {
    url: '/api/common/sentiment-pie',
    method: 'get',
    response: () => {
      const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      
      return {
        success: true,
        data: [
          { name: "正面", value: random(300, 600), color: "#10b981" },
          { name: "负面", value: random(150, 350), color: "#ef4444" },
          { name: "中性", value: random(200, 400), color: "#6b7280" },
        ],
        timestamp: Date.now(),
      };
    },
  },

  // 事件类型统计数据
  {
    url: '/api/common/event-types',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: [
          { name: "娱乐", value: 156, color: "#f59e0b" },
          { name: "政策", value: 89, color: "#3b82f6" },
          { name: "科技", value: 123, color: "#8b5cf6" },
          { name: "体育", value: 67, color: "#10b981" },
          { name: "社会", value: 234, color: "#ef4444" },
          { name: "经济", value: 98, color: "#06b6d4" },
        ],
        timestamp: Date.now(),
      };
    },
  },

  // 帖子数量历史数据
  {
    url: '/api/common/post-count-history',
    method: 'get',
    response: ({ query }: any) => {
      const days = parseInt(query.days) || 7;
      const data = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        data.push({
          date: dateStr,
          count: Math.floor(Math.random() * 1000) + 1200 + (i % 2) * 400
        });
      }
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];