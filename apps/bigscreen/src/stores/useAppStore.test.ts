import { renderHook, act } from '@testing-library/react';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.realTimeData).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setLoading(true);
    });
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should set error state', () => {
    const { result } = renderHook(() => useAppStore());
    const testError = { code: 'TEST_ERROR', message: 'Test error' };
    
    act(() => {
      result.current.setError(testError);
    });
    
    expect(result.current.error).toEqual(testError);
  });

  it('should update real-time data', () => {
    const { result } = renderHook(() => useAppStore());
    const testData = {
      statistics: { total: 100, positive: 50, negative: 30, neutral: 20, growth: 10, growthRate: 0.1 },
      hotTopics: [],
      keywords: [],
      timeSeries: [],
      locations: [],
      recentPosts: []
    };
    
    act(() => {
      result.current.setRealTimeData(testData);
    });
    
    expect(result.current.realTimeData).toEqual(testData);
  });
});