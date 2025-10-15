import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  className?: string;
}

const sizeMap = {
  small: 'w-4 h-4',
  medium: 'w-6 h-6',
  large: 'w-8 h-8',
};

const colorMap = {
  blue: 'text-blue-400',
  white: 'text-white',
  gray: 'text-gray-400',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'blue',
  text,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('flex flex-col items-center justify-center space-y-2', className)}
    >
      <Loader2 className={cn(
        'animate-spin',
        sizeMap[size],
        colorMap[color]
      )} />
      {text && (
        <p className={cn('text-sm', colorMap[color])}>
          {text}
        </p>
      )}
    </motion.div>
  );
};

export default React.memo(LoadingSpinner);
