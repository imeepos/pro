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
  }
];
