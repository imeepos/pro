import React from 'react';
import { motion } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import FullscreenIndicator from './ui/FullscreenIndicator';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  const { isFullscreen } = useFullscreen();
  const { isDark } = useTheme();

  return (
    <div className={cn(
      'h-screen flex flex-col overflow-hidden transition-colors duration-300',
      'bg-background text-foreground'
    )}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          'absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl',
          isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'
        )}></div>
        <div className={cn(
          'absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl',
          isDark ? 'bg-purple-500/10' : 'bg-purple-500/5'
        )}></div>
        <div className={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl',
          isDark ? 'bg-green-500/5' : 'bg-green-500/3'
        )}></div>
      </div>

      {/* 头部 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header className="flex-shrink-0 z-10 relative" />
      </motion.div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 侧边栏 - 全屏时隐藏 */}
        {!isFullscreen && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 w-64"
          >
            <Sidebar className="h-full" />
          </motion.div>
        )}

        {/* 主内容区域 */}
        <motion.main
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(
            'flex-1 overflow-hidden relative transition-all duration-300',
            className
          )}
        >
          <div className={cn(
            'h-full overflow-auto scrollbar-hide transition-all duration-300',
            isFullscreen ? 'p-1' : 'p-2'
          )}>
            {children}
          </div>
        </motion.main>
      </div>


      {/* 全屏指示器 */}
      <FullscreenIndicator />
    </div>
  );
};

export default Layout;
