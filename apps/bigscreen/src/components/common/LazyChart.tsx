import React, { Suspense } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

interface LazyChartProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyChart: React.FC<LazyChartProps> = ({ 
  children, 
  fallback = <LoadingSpinner size="small" text="Loading chart..." /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default React.memo(LazyChart);