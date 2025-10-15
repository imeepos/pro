import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Users,
  Layout,
  Grid3X3,
  Network,
  Share2,
} from 'lucide-react';
import { cn } from '@/utils';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavigationMenuProps {
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'data-overview',
    label: '数据总览',
    path: '/',
    icon: BarChart3,
    description: '全面数据概览与统计'
  },
  {
    id: 'custom-overview',
    label: '自定义总览',
    path: '/custom-overview',
    icon: Grid3X3,
    description: '自定义布局数据总览'
  },
  {
    id: 'event-analysis',
    label: '事件分析',
    path: '/event-analysis',
    icon: Activity,
    description: '热点事件深度分析'
  },
  {
    id: 'user-detection',
    label: '用户检测面板',
    path: '/user-detection',
    icon: Users,
    description: '用户行为监测分析'
  },
  {
    id: 'layout-editor',
    label: '布局编辑器',
    path: '/layout-editor',
    icon: Layout,
    description: '自定义可视化布局'
  },
  {
    id: 'ble-mesh-topology',
    label: 'BLE Mesh拓扑',
    path: '/ble-mesh-topology',
    icon: Network,
    description: 'BLE Mesh网络拓扑可视化'
  },
  {
    id: 'network-topology',
    label: '智能家居拓扑',
    path: '/network-topology',
    icon: Share2,
    description: '智能家居网络拓扑图'
  }
];

const NavigationMenu: React.FC<NavigationMenuProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const renderNavigationGroup = (items: NavigationItem[], startIndex: number = 0) => (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (startIndex + index) * 0.1 }}
            className={cn(
              'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 group',
              isActive
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className={cn(
              'w-5 h-5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            )} />

            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {item.label}
              </div>
              {item.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {item.description}
                </div>
              )}
            </div>

            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="w-2 h-2 bg-blue-400 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <nav className={cn('space-y-6', className)}>
      {renderNavigationGroup(navigationItems)}
    </nav>
  );
};

export default NavigationMenu;
