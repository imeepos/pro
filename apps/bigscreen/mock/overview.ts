/**
 * 数据总览API Mock数据
 */

import { MockMethod } from 'vite-plugin-mock';

// 根据时间范围生成不同的统计数据
const generateStatistics = (timeRange?: string) => {
  const baseData = {
    today: { eventCount: 1234, postCount: 56780, userCount: 8900, interactionCount: 123450 },
    yesterday: { eventCount: 1156, postCount: 52340, userCount: 8654, interactionCount: 115670 },
    thisWeek: { eventCount: 8642, postCount: 387540, userCount: 45620, interactionCount: 856730 },
    lastWeek: { eventCount: 7980, postCount: 356890, userCount: 43210, interactionCount: 789450 },
    thisMonth: { eventCount: 36540, postCount: 1567890, userCount: 187650, interactionCount: 3456780 },
    lastMonth: { eventCount: 33210, postCount: 1432100, userCount: 172340, interactionCount: 3123450 },
    thisQuarter: { eventCount: 125430, postCount: 4567890, userCount: 567890, interactionCount: 9876540 },
    lastQuarter: { eventCount: 118600, postCount: 4234560, userCount: 523400, interactionCount: 9234560 },
    halfYear: { eventCount: 245600, postCount: 8901230, userCount: 987650, interactionCount: 18765430 },
    lastHalfYear: { eventCount: 234500, postCount: 8567890, userCount: 923450, interactionCount: 17654320 },
    thisYear: { eventCount: 456780, postCount: 15678900, userCount: 1876540, interactionCount: 34567890 },
    lastYear: { eventCount: 423450, postCount: 14567890, userCount: 1765430, interactionCount: 32456780 },
    all: { eventCount: 980230, postCount: 45678900, userCount: 4567890, interactionCount: 87654320 },
  };

  const data = baseData[timeRange as keyof typeof baseData] || baseData.today;
  
  // 添加随机变化百分比
  return {
    eventCount: data.eventCount,
    eventCountChange: (Math.random() - 0.5) * 40, // -20% 到 +20%
    postCount: data.postCount,
    postCountChange: (Math.random() - 0.5) * 30,
    userCount: data.userCount,
    userCountChange: (Math.random() - 0.5) * 20,
    interactionCount: data.interactionCount,
    interactionCountChange: (Math.random() - 0.5) * 50,
  };
};

export default [
  {
    url: '/api/overview/statistics',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      
      return {
        success: true,
        data: generateStatistics(timeRange),
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/overview/sentiment',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      
      // 根据时间范围生成不同的情感分析数据
      const baseSentiment = {
        today: { positive: 45, negative: 23, neutral: 32 },
        yesterday: { positive: 43, negative: 25, neutral: 32 },
        thisWeek: { positive: 47, negative: 21, neutral: 32 },
        lastWeek: { positive: 44, negative: 24, neutral: 32 },
        thisMonth: { positive: 46, negative: 22, neutral: 32 },
        lastMonth: { positive: 42, negative: 26, neutral: 32 },
        thisQuarter: { positive: 48, negative: 20, neutral: 32 },
        lastQuarter: { positive: 46, negative: 22, neutral: 32 },
        halfYear: { positive: 47, negative: 21, neutral: 32 },
        lastHalfYear: { positive: 45, negative: 23, neutral: 32 },
        thisYear: { positive: 45, negative: 23, neutral: 32 },
        lastYear: { positive: 44, negative: 24, neutral: 32 },
        all: { positive: 46, negative: 22, neutral: 32 },
      };
      
      const data = baseSentiment[timeRange as keyof typeof baseSentiment] || baseSentiment.today;
      
      return {
        success: true,
        data: {
          positive: { value: data.positive, change: (Math.random() - 0.5) * 10 },
          negative: { value: data.negative, change: (Math.random() - 0.5) * 8 },
          neutral: { value: data.neutral, change: (Math.random() - 0.5) * 4 }
        },
        timestamp: Date.now(),
      };
    },
  },

  {
    url: '/api/overview/locations',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.timeRange || 'today';
      
      // 根据时间范围生成不同倍数的地理数据
      const multipliers = {
        today: 1,
        yesterday: 0.9,
        thisWeek: 7,
        lastWeek: 6.5,
        thisMonth: 30,
        lastMonth: 28,
        thisQuarter: 90,
        lastQuarter: 85,
        halfYear: 180,
        lastHalfYear: 175,
        thisYear: 365,
        lastYear: 350,
        all: 730,
      };
      
      const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;
      
      const baseLocations = [
        { name: "北京", coordinates: [116.4074, 39.9042], value: 1234, sentiment: "positive" },
        { name: "上海", coordinates: [121.4737, 31.2304], value: 987, sentiment: "positive" },
        { name: "广州", coordinates: [113.2644, 23.1291], value: 856, sentiment: "neutral" },
        { name: "深圳", coordinates: [114.0579, 22.5431], value: 743, sentiment: "positive" },
        { name: "杭州", coordinates: [120.1551, 30.2741], value: 654, sentiment: "positive" },
        { name: "南京", coordinates: [118.7969, 32.0603], value: 543, sentiment: "neutral" },
        { name: "武汉", coordinates: [114.3054, 30.5931], value: 432, sentiment: "negative" },
        { name: "成都", coordinates: [104.0665, 30.5723], value: 398, sentiment: "positive" },
        { name: "西安", coordinates: [108.9398, 34.3416], value: 321, sentiment: "neutral" },
        { name: "重庆", coordinates: [106.5516, 29.563], value: 298, sentiment: "positive" }
      ];
      
      return {
        success: true,
        data: baseLocations.map(location => ({
          ...location,
          value: Math.floor(location.value * multiplier * (0.8 + Math.random() * 0.4)) // 添加20%随机变化
        })),
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];