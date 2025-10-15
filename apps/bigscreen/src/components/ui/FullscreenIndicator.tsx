import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize, Clock, Wifi, WifiOff } from 'lucide-react';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAppStore } from '@/stores/useAppStore';
import { formatTime, cn } from '@/utils';

interface FullscreenIndicatorProps {
  className?: string;
}

/**
 * 全屏模式指示器
 * 在全屏模式下显示基本信息和退出按钮
 */
const FullscreenIndicator: React.FC<FullscreenIndicatorProps> = ({ className }) => {
  const { isFullscreen, exitFullscreen } = useFullscreen();
  const { isConnected } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showIndicator, setShowIndicator] = useState(true);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 自动隐藏指示器
  useEffect(() => {
    if (!isFullscreen) return;

    let hideTimer: NodeJS.Timeout | undefined = undefined;
    const showTimer: NodeJS.Timeout | undefined = undefined;

    const resetTimer = () => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);

      setShowIndicator(true);

      hideTimer = setTimeout(() => {
        setShowIndicator(false);
      }, 3000); // 3秒后隐藏
    };

    const handleMouseMove = () => {
      resetTimer();
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreen();
      }
      resetTimer();
    };

    // 初始显示
    resetTimer();

    // 添加事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFullscreen, exitFullscreen]);

  if (!isFullscreen) return null;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
            'bg-black/80 backdrop-blur-md rounded-lg px-4 py-2',
            'border border-border shadow-lg',
            className
          )}
        >
          <div className="flex items-center space-x-4">
            {/* 连接状态 */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400">连接断开</span>
                </>
              )}
            </div>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-white/20"></div>

            {/* 当前时间 */}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-mono text-white">
                {formatTime(currentTime)}
              </span>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-white/20"></div>

            {/* 退出全屏按钮 */}
            <button
              onClick={exitFullscreen}
              className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-white/10 transition-colors group"
              title="退出全屏 (ESC)"
            >
              <Minimize className="w-4 h-4 text-gray-400 group-hover:text-white" />
              <span className="text-xs text-gray-400 group-hover:text-white">退出</span>
            </button>
          </div>

          {/* 提示文本 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs text-gray-500">
              按 ESC 键或点击退出按钮退出全屏
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenIndicator;
