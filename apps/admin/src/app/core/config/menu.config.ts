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
  }
];
