import { renderHook, waitFor } from '@testing-library/react';
import { 
  useAgeDistribution, 
  useGenderDistribution, 
  useSentimentTrend, 
  useGeographicData,
  useDashboardData 
} from './useChartData';
import { ChartsAPI } from '@/services/api/charts';

// Mock the ChartsAPI
vi.mock('@/services/api/charts', () => ({
  ChartsAPI: {
    getAgeDistribution: vi.fn(),
    getGenderDistribution: vi.fn(),
    getSentimentTrend: vi.fn(),
    getGeographicData: vi.fn(),
    getEventTypes: vi.fn(),
    getWordCloudData: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('useChartData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAgeDistribution', () => {
    it('should fetch age distribution successfully', async () => {
      const mockData = [
        { age: '18-25', value: 450, percentage: 25 },
        { age: '26-35', value: 680, percentage: 38 },
      ];

      (ChartsAPI.getAgeDistribution as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useAgeDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(ChartsAPI.getAgeDistribution).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('API Error');
      (ChartsAPI.getAgeDistribution as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAgeDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });

    it('should provide refetch functionality', async () => {
      const mockData = [{ age: '18-25', value: 450, percentage: 25 }];
      (ChartsAPI.getAgeDistribution as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useAgeDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await result.current.refetch();

      expect(ChartsAPI.getAgeDistribution).toHaveBeenCalledTimes(2);
    });
  });

  describe('useGenderDistribution', () => {
    it('should fetch gender distribution successfully', async () => {
      const mockData = [
        { gender: 'male', value: 520, percentage: 52 },
        { gender: 'female', value: 480, percentage: 48 },
      ];

      (ChartsAPI.getGenderDistribution as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useGenderDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(ChartsAPI.getGenderDistribution).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Network Error');
      (ChartsAPI.getGenderDistribution as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useGenderDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });
  });

  describe('useSentimentTrend', () => {
    it('should fetch sentiment trend with default parameters', async () => {
      const mockData = [
        { date: '2024-01-01', positive: 60, negative: 20, neutral: 20 },
        { date: '2024-01-02', positive: 65, negative: 18, neutral: 17 },
      ];

      (ChartsAPI.getSentimentTrend as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSentimentTrend());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(ChartsAPI.getSentimentTrend).toHaveBeenCalledWith(24);
      expect(result.current.data).toEqual(mockData);
    });

    it('should fetch sentiment trend with custom hours', async () => {
      const mockData = [
        { date: '2024-01-01', positive: 60, negative: 20, neutral: 20 },
      ];

      (ChartsAPI.getSentimentTrend as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSentimentTrend(48));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(ChartsAPI.getSentimentTrend).toHaveBeenCalledWith(48);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useGeographicData', () => {
    it('should fetch geographic data successfully', async () => {
      const mockData = [
        { province: 'Beijing', value: 500 },
        { province: 'Shanghai', value: 450 },
      ];

      (ChartsAPI.getGeographicData as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useGeographicData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(ChartsAPI.getGeographicData).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useDashboardData', () => {
    beforeEach(() => {
      // Mock all API calls
      (ChartsAPI.getAgeDistribution as any).mockResolvedValue([]);
      (ChartsAPI.getGenderDistribution as any).mockResolvedValue([]);
      (ChartsAPI.getSentimentTrend as any).mockResolvedValue([]);
      (ChartsAPI.getGeographicData as any).mockResolvedValue([]);
      (ChartsAPI.getEventTypes as any).mockResolvedValue([]);
      (ChartsAPI.getWordCloudData as any).mockResolvedValue([]);
    });

    it('should combine multiple data sources', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toHaveProperty('ageDistribution');
      expect(result.current.data).toHaveProperty('genderDistribution');
      expect(result.current.data).toHaveProperty('sentimentTrend');
      expect(result.current.data).toHaveProperty('geographic');
      expect(result.current.data).toHaveProperty('eventTypes');
      expect(result.current.data).toHaveProperty('wordCloud');
    });

    it('should provide refetchAll functionality', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await result.current.refetchAll();

      // Each API should be called twice (initial + refetch)
      expect(ChartsAPI.getAgeDistribution).toHaveBeenCalledTimes(2);
      expect(ChartsAPI.getGenderDistribution).toHaveBeenCalledTimes(2);
      expect(ChartsAPI.getSentimentTrend).toHaveBeenCalledTimes(2);
      expect(ChartsAPI.getGeographicData).toHaveBeenCalledTimes(2);
      expect(ChartsAPI.getEventTypes).toHaveBeenCalledTimes(2);
      expect(ChartsAPI.getWordCloudData).toHaveBeenCalledTimes(2);
    });

    it('should aggregate errors from multiple sources', async () => {
      (ChartsAPI.getAgeDistribution as any).mockRejectedValue(new Error('Age error'));
      (ChartsAPI.getGenderDistribution as any).mockRejectedValue(new Error('Gender error'));

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errors).toHaveLength(2);
    });

    it('should detect stale data', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially data should not be stale
      expect(result.current.hasStaleData).toBe(false);
    });
  });

  describe('data caching and staleness', () => {
    it('should mark data as stale after cache time', async () => {
      vi.useFakeTimers();

      const mockData = [{ age: '18-25', value: 450, percentage: 25 }];
      (ChartsAPI.getAgeDistribution as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useAgeDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isStale).toBe(false);

      // Fast forward past cache time (10 minutes)
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(result.current.isStale).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('error handling and retries', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network Error');
      (ChartsAPI.getAgeDistribution as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAgeDistribution());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });

    it('should attempt retries on failure', async () => {
      vi.useFakeTimers();

      // First two calls fail, third succeeds
      (ChartsAPI.getAgeDistribution as any)
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'))
        .mockResolvedValueOnce([{ age: '18-25', value: 450 }]);

      const { result } = renderHook(() => useAgeDistribution());

      // Wait for initial call
      await waitFor(() => expect(result.current.loading).toBe(true));

      // Advance timers to trigger retries
      vi.advanceTimersByTime(2000); // First retry delay
      await waitFor(() => expect(ChartsAPI.getAgeDistribution).toHaveBeenCalledTimes(2));

      vi.advanceTimersByTime(4000); // Second retry delay
      await waitFor(() => expect(ChartsAPI.getAgeDistribution).toHaveBeenCalledTimes(3));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toBeTruthy();
      expect(result.current.error).toBeNull();

      vi.useRealTimers();
    });
  });
});