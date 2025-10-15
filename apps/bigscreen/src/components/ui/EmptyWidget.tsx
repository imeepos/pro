/**
 * 空白组件
 * 用作布局占位符或组件选择的起始状态
 */

import React from 'react';
import { Plus, Package } from 'lucide-react';
import { cn } from '@/utils';

interface EmptyWidgetProps {
  /** 占位文字 */
  placeholder?: string;
  /** 是否显示边框 */
  showBorder?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击事件处理 */
  onClick?: () => void;
  /** 自定义样式类 */
  className?: string;
  /** 组件高度 */
  height?: number;
}

const EmptyWidget: React.FC<EmptyWidgetProps> = ({
  placeholder = '点击选择组件',
  showBorder = true,
  clickable = true,
  onClick,
  className,
  height = 200
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg transition-colors',
        showBorder && 'border-2 border-dashed border-gray-300',
        clickable && 'hover:bg-gray-100 hover:border-gray-400 cursor-pointer',
        !clickable && 'cursor-default',
        className
      )}
      style={{ height }}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex flex-col items-center space-y-2">
        {clickable ? (
          <Plus className="w-8 h-8 text-gray-300" />
        ) : (
          <Package className="w-8 h-8 text-gray-300" />
        )}
        <span className="text-sm font-medium">{placeholder}</span>
        {clickable && (
          <span className="text-xs text-gray-300">
            选择要添加的组件
          </span>
        )}
      </div>
    </div>
  );
};

export default React.memo(EmptyWidget);