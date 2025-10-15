import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils';

interface AlertPanelProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  className?: string;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    iconColor: 'text-blue-400',
  },
};

const AlertPanel: React.FC<AlertPanelProps> = ({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const config = alertConfig[type];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'glass-card border rounded-lg p-4 max-w-md',
            config.bg,
            config.border,
            className
          )}
        >
          <div className="flex items-start space-x-3">
            {/* 图标 */}
            <div className="flex-shrink-0">
              <IconComponent className={cn('w-5 h-5', config.iconColor)} />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <h3 className={cn('text-sm font-semibold', config.text)}>
                {title}
              </h3>
              <p className="text-sm text-gray-300 mt-1">
                {message}
              </p>

              {/* 操作按钮 */}
              {action && (
                <div className="mt-3">
                  <button
                    onClick={action.onClick}
                    disabled={action.loading}
                    className={cn(
                      'inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      config.text,
                      'hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {action.loading && (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                    <span>{action.label}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertPanel;
