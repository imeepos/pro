export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  permission?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: 'home',
    route: '/dashboard'
  },
  {
    id: 'api-keys',
    label: 'API Key管理',
    icon: 'key',
    route: '/api-keys'
  },
  {
    id: 'data',
    label: '数据管理',
    icon: 'database',
    children: [
      {
        id: 'data-list',
        label: '数据列表',
        icon: 'list',
        route: '/data'
      },
      {
        id: 'dlq-manager',
        label: '死信队列管理',
        icon: 'alert',
        route: '/dlq-manager'
      }
    ]
  },
  {
    id: 'screens',
    label: '大屏管理',
    icon: 'monitor',
    children: [
      {
        id: 'screens-list',
        label: '大屏列表',
        icon: 'list',
        route: '/screens'
      }
    ]
  },
  {
    id: 'events',
    label: '事件管理',
    icon: 'calendar',
    children: [
      {
        id: 'events-list',
        label: '事件列表',
        icon: 'list',
        route: '/events'
      },
      {
        id: 'industry-types',
        label: '行业类型管理',
        icon: 'apartment',
        route: '/events/industry-types'
      },
      {
        id: 'event-types',
        label: '事件类型管理',
        icon: 'tags',
        route: '/events/event-types'
      }
    ]
  },
  {
    id: 'weibo',
    label: '微博账号管理',
    icon: 'user-circle',
    children: [
      {
        id: 'weibo-accounts',
        label: '账号列表',
        icon: 'users',
        route: '/weibo/accounts'
      }
    ]
  },
  {
    id: 'weibo-data',
    label: '微博数据管理',
    icon: 'document-text',
    children: [
      {
        id: 'weibo-posts',
        label: '帖子管理',
        icon: 'document',
        route: '/weibo-data/posts'
      },
      {
        id: 'weibo-users',
        label: '用户管理',
        icon: 'users',
        route: '/weibo-data/users'
      },
      {
        id: 'weibo-comments',
        label: '评论管理',
        icon: 'chat',
        route: '/weibo-data/comments'
      },
      {
        id: 'weibo-interactions',
        label: '互动数据',
        icon: 'heart',
        route: '/weibo-data/interactions'
      }
    ]
  },
  {
    id: 'weibo-search',
    label: '微博搜索任务',
    icon: 'search',
    children: [
      {
        id: 'weibo-search-tasks',
        label: '搜索任务',
        icon: 'list',
        route: '/weibo-search-tasks'
      }
    ]
  },
  {
    id: 'workflows',
    label: '工作流管理',
    icon: 'cog',
    children: [
      {
        id: 'workflows-list',
        label: '工作流列表',
        icon: 'list',
        route: '/workflows'
      }
    ]
  },
  {
    id: 'jd',
    label: '京东账号管理',
    icon: 'shopping-cart',
    children: [
      {
        id: 'jd-accounts',
        label: '账号列表',
        icon: 'users',
        route: '/jd/accounts'
      }
    ]
  },
  {
    id: 'media-type',
    label: '媒体类型管理',
    icon: 'film',
    children: [
      {
        id: 'media-type-list',
        label: '类型列表',
        icon: 'list',
        route: '/media-type'
      }
    ]
  }
];
