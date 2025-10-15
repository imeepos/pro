/**
 * 情感分析API Mock数据
 */

import { MockMethod } from 'vite-plugin-mock';

// 生成随机日期数据
const generateTimeSeriesData = (hours: number = 24) => {
  const now = new Date();
  const data = [];
  
  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
    data.push({
      timestamp: timestamp.toISOString(),
      positive: Math.floor(Math.random() * 20) + 40,
      negative: Math.floor(Math.random() * 10) + 15,
      neutral: Math.floor(Math.random() * 15) + 35,
      total: Math.floor(Math.random() * 100) + 200
    });
  }
  
  return data;
};

// 生成热点话题数据
const generateHotTopics = (limit: number = 10) => {
  const topics = [
    '人工智能发展趋势',
    '新能源汽车政策',
    '教育改革措施',
    '医疗保障制度',
    '环保政策实施',
    '科技创新突破',
    '经济发展态势',
    '社会保障体系',
    '文化产业发展',
    '数字化转型',
    '绿色发展理念',
    '智能制造升级',
    '乡村振兴战略',
    '城市化建设',
    '国际合作交流'
  ];
  
  return topics.slice(0, limit).map((topic, index) => ({
    id: `topic-${index + 1}`,
    title: topic,
    heat_score: Math.floor(Math.random() * 500) + 500,
    mention_count: Math.floor(Math.random() * 1000) + 200,
    sentiment_score: (Math.random() - 0.5) * 2, // -1 到 1 之间
    trend: Math.random() > 0.5 ? 'up' : 'down',
    keywords: ['关键词1', '关键词2', '关键词3'],
    created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
  }));
};

// 生成关键词数据
const generateKeywords = (limit: number = 50) => {
  const keywords = [
    '人工智能', '机器学习', '深度学习', '大数据', '云计算',
    '物联网', '区块链', '5G', '智能制造', '数字化',
    '新能源', '环保', '可持续发展', '绿色出行', '清洁能源',
    '教育改革', '在线教育', '职业培训', '人才培养', '创新创业',
    '医疗健康', '远程医疗', '精准医疗', '健康管理', '药物研发',
    '经济发展', '金融科技', '数字货币', '投资理财', '创业投资',
    '文化产业', '内容创作', '版权保护', '文化传承', '艺术创新',
    '社会保障', '养老保险', '医疗保险', '就业保障', '社会福利',
    '城市建设', '智慧城市', '交通规划', '基础设施', '城市管理',
    '国际合作', '一带一路', '全球化', '贸易往来', '文化交流'
  ];
  
  return keywords.slice(0, limit).map((keyword, _index) => ({
    name: keyword,
    value: Math.floor(Math.random() * 500) + 100,
    sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as 'positive' | 'negative' | 'neutral'
  }));
};

// 生成地理位置数据
const generateLocationData = () => {
  const locations = [
    { name: '北京', coordinates: [116.4074, 39.9042] },
    { name: '上海', coordinates: [121.4737, 31.2304] },
    { name: '广州', coordinates: [113.2644, 23.1291] },
    { name: '深圳', coordinates: [114.0579, 22.5431] },
    { name: '杭州', coordinates: [120.1551, 30.2741] },
    { name: '成都', coordinates: [104.0665, 30.5723] },
    { name: '武汉', coordinates: [114.3054, 30.5931] },
    { name: '西安', coordinates: [108.9402, 34.3416] }
  ];
  
  return locations.map(location => ({
    ...location,
    value: Math.floor(Math.random() * 1000) + 200,
    sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as 'positive' | 'negative' | 'neutral',
    posts: Math.floor(Math.random() * 500) + 100
  }));
};

// 生成最近帖子数据
const generateRecentPosts = (limit: number = 20) => {
  const posts = [];
  const authors = ['用户A', '用户B', '用户C', '用户D', '用户E'];
  const contents = [
    '对最新政策表示支持和赞同',
    '希望能够进一步完善相关措施',
    '这个决定很有前瞻性',
    '期待看到更多积极变化',
    '需要更多时间观察效果'
  ];
  
  for (let i = 0; i < limit; i++) {
    posts.push({
      id: `post-${i + 1}`,
      content: contents[Math.floor(Math.random() * contents.length)],
      author: authors[Math.floor(Math.random() * authors.length)],
      sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as 'positive' | 'negative' | 'neutral',
      score: Math.random() * 2 - 1, // -1 到 1 之间
      created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      likes: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 30)
    });
  }
  
  return posts;
};

export default [
  // 获取实时数据
  {
    url: '/api/sentiment/realtime',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.range || '24h';
      
      return {
        success: true,
        data: {
          current: {
            positive: Math.floor(Math.random() * 1000) + 2000,
            negative: Math.floor(Math.random() * 500) + 300,
            neutral: Math.floor(Math.random() * 800) + 1000,
            total: Math.floor(Math.random() * 2000) + 3500
          },
          trend: generateTimeSeriesData(timeRange === '24h' ? 24 : timeRange === '7d' ? 7 * 24 : 24),
          timeRange
        },
        timestamp: Date.now(),
      };
    },
  },

  // 获取统计数据
  {
    url: '/api/sentiment/statistics',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.range || '24h';
      
      const positive = Math.floor(Math.random() * 1000) + 2000;
      const negative = Math.floor(Math.random() * 500) + 300;
      const neutral = Math.floor(Math.random() * 800) + 1000;
      const total = positive + negative + neutral;
      
      return {
        success: true,
        data: {
          positive,
          negative,
          neutral,
          total,
          growthRate: (Math.random() - 0.5) * 0.4, // -20% 到 20% 之间
          timeRange,
          breakdown: {
            positive_percentage: Math.round((positive / total) * 100),
            negative_percentage: Math.round((negative / total) * 100),
            neutral_percentage: Math.round((neutral / total) * 100)
          }
        },
        timestamp: Date.now(),
      };
    },
  },

  // 获取热点话题
  {
    url: '/api/sentiment/hot-topics',
    method: 'get',
    response: ({ query }: any) => {
      const limit = parseInt(query?.limit) || 10;
      
      return {
        success: true,
        data: generateHotTopics(limit),
        timestamp: Date.now(),
      };
    },
  },

  // 获取关键词
  {
    url: '/api/sentiment/keywords',
    method: 'get',
    response: ({ query }: any) => {
      const limit = parseInt(query?.limit) || 50;
      
      return {
        success: true,
        data: generateKeywords(limit),
        timestamp: Date.now(),
      };
    },
  },

  // 获取时间序列数据
  {
    url: '/api/sentiment/time-series',
    method: 'get',
    response: ({ query }: any) => {
      const timeRange = query?.range || '24h';
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 * 24 : 24;
      
      return {
        success: true,
        data: generateTimeSeriesData(hours),
        timestamp: Date.now(),
      };
    },
  },

  // 获取地理位置数据
  {
    url: '/api/sentiment/locations',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: generateLocationData(),
        timestamp: Date.now(),
      };
    },
  },

  // 获取最近帖子
  {
    url: '/api/sentiment/recent-posts',
    method: 'get',
    response: ({ query }: any) => {
      const limit = parseInt(query?.limit) || 20;
      
      return {
        success: true,
        data: generateRecentPosts(limit),
        timestamp: Date.now(),
      };
    },
  },

  // 搜索相关内容
  {
    url: '/api/sentiment/search',
    method: 'post',
    response: ({ body }: any) => {
      const { query, filters } = body;
      
      // 模拟搜索结果
      const results = generateRecentPosts(10).filter(post => 
        post.content.includes(query) || 
        post.author.includes(query)
      );
      
      return {
        success: true,
        data: {
          query,
          filters,
          results,
          total: results.length,
          page: 1,
          pageSize: 10
        },
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];