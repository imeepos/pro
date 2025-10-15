import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItem } from '../components/layout/GridContainer';

export interface LayoutArea {
  id: string;
  title: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  component: string | null;
  type?: 'widget' | 'container';
  placeholder?: string;
  allowedComponents?: string[];
  props?: Record<string, any>;
}

export interface LayoutConfig {
  id: string;
  name: string;
  description?: string;
  items: GridItem[];
  cols: number;
  rowHeight: number;
  gap: number;
  createdAt: string;
  updatedAt: string;
  areas?: LayoutArea[];
  thumbnail?: string;
  category?: string;
}

// Legacy type alias for backward compatibility
export type LayoutTemplate = LayoutConfig;

export interface WidgetConfig {
  id: string;
  name: string;
  component: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category: string;
  description?: string;
  icon?: string;
  defaultProps?: Record<string, any>;
}

interface LayoutStore {
  // 当前布局
  currentLayout: LayoutConfig | null;
  
  // 保存的布局列表
  savedLayouts: LayoutConfig[];
  
  // 可用组件库
  availableWidgets: WidgetConfig[];
  
  // 编辑状态
  isEditMode: boolean;
  
  // 操作方法
  setCurrentLayout: (layout: LayoutConfig) => void;
  updateCurrentLayout: (updates: Partial<LayoutConfig>) => void;
  saveLayout: (layout: LayoutConfig) => void;
  deleteLayout: (layoutId: string) => void;
  loadLayout: (layoutId: string) => void;
  
  // 组件管理
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  
  // 网格项操作
  addGridItem: (item: Omit<GridItem, 'id'>) => void;
  updateGridItem: (itemId: string, updates: Partial<GridItem>) => void;
  removeGridItem: (itemId: string) => void;
  updateGridItems: (items: GridItem[]) => void;
  
  // 编辑模式
  toggleEditMode: () => void;
  setEditMode: (isEdit: boolean) => void;
  
  // 导入导出
  exportLayout: (layoutId: string) => string;
  importLayout: (layoutData: string) => boolean;
  
  // 重置
  resetToDefault: () => void;
}

// 默认可用组件
const defaultWidgets: WidgetConfig[] = [
  {
    id: 'sentiment-trend',
    name: '情感趋势图',
    component: 'SentimentTrendChart',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    category: 'analytics',
    description: '显示舆情情感随时间变化的趋势分析',
    icon: '📈',
    defaultProps: { height: 300 }
  },
  {
    id: 'word-cloud',
    name: '词云图',
    component: 'WordCloudChart',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    category: 'analytics',
    description: '关键词频次分布可视化，展现热点话题',
    icon: '☁️',
    defaultProps: { height: 300, maxWords: 100 }
  },
  {
    id: 'geographic-chart',
    name: '地理分布图',
    component: 'GeographicChart',
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 4 },
    maxSize: { w: 12, h: 10 },
    category: 'geographic',
    description: '展示事件或用户的地理位置分布情况',
    icon: '🗺️',
    defaultProps: { height: 300 }
  },
  {
    id: 'hot-events',
    name: '热点事件',
    component: 'HotEventsList',
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    maxSize: { w: 8, h: 12 },
    category: 'events',
    description: '实时热点事件列表，按热度排序展示',
    icon: '🔥',
    defaultProps: {}
  },
  {
    id: 'stats-overview',
    name: '数据概览',
    component: 'StatsOverview',
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 4 },
    category: 'overview',
    description: '关键指标概览面板，显示核心数据统计',
    icon: '📊',
    defaultProps: {}
  }
];

// 默认布局
const defaultLayout: LayoutConfig = {
  id: 'default',
  name: '默认布局',
  description: '系统默认仪表板布局',
  cols: 12,
  rowHeight: 100,
  gap: 16,
  items: [
    {
      id: 'stats-1',
      x: 0, y: 0, w: 12, h: 2,
      component: 'StatsOverview',
      props: {}
    },
    {
      id: 'sentiment-1',
      x: 0, y: 2, w: 6, h: 4,
      component: 'SentimentTrendChart',
      props: {}
    },
    {
      id: 'wordcloud-1',
      x: 6, y: 2, w: 6, h: 4,
      component: 'WordCloudChart',
      props: {}
    },
    {
      id: 'geographic-1',
      x: 0, y: 6, w: 8, h: 6,
      component: 'GeographicChart',
      props: {}
    },
    {
      id: 'events-1',
      x: 8, y: 6, w: 4, h: 6,
      component: 'HotEventsList',
      props: {}
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      currentLayout: defaultLayout,
      savedLayouts: [defaultLayout],
      availableWidgets: defaultWidgets,
      isEditMode: false,

      setCurrentLayout: (layout) => {
        set({ currentLayout: layout });
      },

      updateCurrentLayout: (updates) => {
        const current = get().currentLayout;
        if (current) {
          const updated = {
            ...current,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          set({ currentLayout: updated });
        }
      },

      saveLayout: (layout) => {
        const { savedLayouts } = get();
        const existingIndex = savedLayouts.findIndex(l => l.id === layout.id);
        const updated = {
          ...layout,
          updatedAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
          const newLayouts = [...savedLayouts];
          newLayouts[existingIndex] = updated;
          set({ savedLayouts: newLayouts });
        } else {
          set({ savedLayouts: [...savedLayouts, updated] });
        }
      },

      deleteLayout: (layoutId) => {
        const { savedLayouts } = get();
        set({ 
          savedLayouts: savedLayouts.filter(l => l.id !== layoutId)
        });
      },

      loadLayout: (layoutId) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find(l => l.id === layoutId);
        if (layout) {
          set({ currentLayout: layout });
        }
      },

      addWidget: (widget) => {
        const { availableWidgets } = get();
        set({ 
          availableWidgets: [...availableWidgets, widget]
        });
      },

      removeWidget: (widgetId) => {
        const { availableWidgets } = get();
        set({ 
          availableWidgets: availableWidgets.filter(w => w.id !== widgetId)
        });
      },

      addGridItem: (item) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const newItem: GridItem = {
            ...item,
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          const updatedLayout = {
            ...currentLayout,
            items: [...currentLayout.items, newItem],
            updatedAt: new Date().toISOString()
          };
          
          set({ currentLayout: updatedLayout });
        }
      },

      updateGridItem: (itemId, updates) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedItems = currentLayout.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );
          
          const updatedLayout = {
            ...currentLayout,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };
          
          set({ currentLayout: updatedLayout });
        }
      },

      removeGridItem: (itemId) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedItems = currentLayout.items.filter(item => item.id !== itemId);
          
          const updatedLayout = {
            ...currentLayout,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };
          
          set({ currentLayout: updatedLayout });
        }
      },

      updateGridItems: (items) => {
        const { currentLayout } = get();
        if (currentLayout) {
          const updatedLayout = {
            ...currentLayout,
            items,
            updatedAt: new Date().toISOString()
          };
          
          set({ currentLayout: updatedLayout });
        }
      },

      toggleEditMode: () => {
        set((state) => ({ isEditMode: !state.isEditMode }));
      },

      setEditMode: (isEdit) => {
        set({ isEditMode: isEdit });
      },

      exportLayout: (layoutId) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find(l => l.id === layoutId);
        return layout ? JSON.stringify(layout, null, 2) : '';
      },

      importLayout: (layoutData) => {
        try {
          const layout: LayoutConfig = JSON.parse(layoutData);
          // 验证数据结构
          if (layout.id && layout.name && Array.isArray(layout.items)) {
            const { savedLayouts } = get();
            set({ 
              savedLayouts: [...savedLayouts, {
                ...layout,
                id: `imported-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }]
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      resetToDefault: () => {
        set({
          currentLayout: defaultLayout,
          savedLayouts: [defaultLayout],
          availableWidgets: defaultWidgets,
          isEditMode: false
        });
      }
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        currentLayout: state.currentLayout,
        savedLayouts: state.savedLayouts,
        availableWidgets: state.availableWidgets
      })
    }
  )
);