import React from 'react';
import { LayoutConfig } from '../../stores/useLayoutStore';
import type { GridItem } from './GridContainer';
import { twMerge } from 'tailwind-merge';
import { renderComponentWithTimeRange } from './LayoutComponentProvider';
import { useAppStore } from '@/stores/useAppStore';

interface DataOverviewRendererProps {
  layout: LayoutConfig;
  className?: string;
}

export const DataOverviewRenderer: React.FC<DataOverviewRendererProps> = ({
  layout,
  className
}) => {
  const { selectedTimeRange } = useAppStore();

  // 渲染单个网格项
  const renderItem = (item: GridItem) => {
    return (
      <div
        key={item.id}
        className="glass-card sentiment-overview-card overflow-hidden flex flex-col"
        style={{
          gridColumn: `${item.x + 1} / ${item.x + item.w + 1}`,
          gridRow: `${item.y + 1} / ${item.y + item.h + 1}`
        }}
      >
        {/* 组件内容 */}
        <div className="h-full w-full overflow-hidden">
          {item.component ? 
            renderComponentWithTimeRange(
              typeof item.component === 'string' ? item.component : item.component.name, 
              selectedTimeRange, 
              item.props || {}
            ) : 
            (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-sm">选择组件</div>
                  <div className="text-xs mt-1 text-gray-500">
                    {item.w}×{item.h}
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </div>
    );
  };

  return (
    <div 
      className={twMerge('h-full overflow-hidden', className)}
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <div 
        className="grid gap-2 lg:gap-3 h-full overflow-hidden"
        style={{ 
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: 'repeat(20, 1fr)'
        }}
      >
        {(layout.items || layout.areas || []).map(renderItem)}
      </div>
    </div>
  );
};