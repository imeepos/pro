import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartsAPI } from './charts';
import { apiClient } from './apiClient';

// Mock the apiClient
vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('ChartsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOverviewStats', () => {
    it('should fetch overview statistics successfully', async () => {
      const mockResponse = {
        totalPosts: 1000,
        sentiment: { positive: 60, negative: 20, neutral: 20 },
        growth: 15,
        activeUsers: 500,
      };

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getOverviewStats();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/overview');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(ChartsAPI.getOverviewStats()).rejects.toThrow('API Error');
    });
  });

  describe('getEmotionCurve', () => {
    it('should fetch emotion curve data with default points', async () => {
      const mockResponse = [
        { time: '2024-01-01', positive: 60, negative: 20, neutral: 20 },
        { time: '2024-01-02', positive: 65, negative: 18, neutral: 17 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getEmotionCurve();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/emotion-curve?points=7');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch emotion curve data with custom points', async () => {
      const mockResponse = [
        { time: '2024-01-01', positive: 60, negative: 20, neutral: 20 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getEmotionCurve(30);

      expect(apiClient.get).toHaveBeenCalledWith('/charts/emotion-curve?points=30');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEventCount', () => {
    it('should fetch event count data with time range', async () => {
      const mockResponse = [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 15 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getEventCount('7d');

      expect(apiClient.get).toHaveBeenCalledWith('/charts/event-count?range=7d');
      expect(result).toEqual(mockResponse);
    });

    it('should handle missing range parameter', async () => {
      const mockResponse: any[] = [];
      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getEventCount();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/event-count?range=undefined');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getHotEvents', () => {
    it('should fetch hot events with default limit', async () => {
      const mockResponse = [
        { id: 1, title: 'Event 1', heat: 100 },
        { id: 2, title: 'Event 2', heat: 90 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getHotEvents();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/hot-events?limit=10');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch hot events with custom limit', async () => {
      const mockResponse = [
        { id: 1, title: 'Event 1', heat: 100 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getHotEvents(5);

      expect(apiClient.get).toHaveBeenCalledWith('/charts/hot-events?limit=5');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPostCount', () => {
    it('should fetch post count data with time range', async () => {
      const mockResponse = [
        { hour: '00:00', count: 50 },
        { hour: '01:00', count: 45 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getPostCount('24h');

      expect(apiClient.get).toHaveBeenCalledWith('/charts/post-count?range=24h');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEventTypeDistribution', () => {
    it('should fetch event type distribution data', async () => {
      const mockResponse = [
        { type: 'Politics', count: 150 },
        { type: 'Entertainment', count: 200 },
        { type: 'Sports', count: 100 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getEventTypeDistribution();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/event-type-distribution');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAgeDistribution', () => {
    it('should fetch age distribution data', async () => {
      const mockResponse = [
        { age: '18-25', value: 450, percentage: 25 },
        { age: '26-35', value: 680, percentage: 38 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getAgeDistribution();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/age-distribution');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getGenderDistribution', () => {
    it('should fetch gender distribution data', async () => {
      const mockResponse = [
        { gender: 'male', value: 520, percentage: 52 },
        { gender: 'female', value: 480, percentage: 48 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getGenderDistribution();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/gender-distribution');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSentimentTrend', () => {
    it('should fetch sentiment trend data with time range', async () => {
      const mockResponse = [
        { date: '2024-01-01', positive: 60, negative: 20, neutral: 20 },
        { date: '2024-01-02', positive: 65, negative: 18, neutral: 17 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getSentimentTrend(7);

      expect(apiClient.get).toHaveBeenCalledWith('/charts/sentiment-trend', {
        params: { hours: 7 },
        retry: { count: 3, delay: 1000 },
        timeout: 10000,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getWordCloud', () => {
    it('should fetch word cloud data with default limit', async () => {
      const mockResponse = [
        { text: 'keyword1', value: 100 },
        { text: 'keyword2', value: 80 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getWordCloud();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/word-cloud?limit=100');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch word cloud data with custom limit', async () => {
      const mockResponse = [
        { text: 'keyword1', value: 100 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getWordCloud(50);

      expect(apiClient.get).toHaveBeenCalledWith('/charts/word-cloud?limit=50');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getGeographicData', () => {
    it('should fetch geographic data', async () => {
      const mockResponse = [
        { province: 'Beijing', value: 500 },
        { province: 'Shanghai', value: 450 },
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getGeographicData();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/geographic');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getHeatmapData', () => {
    it('should fetch heatmap data', async () => {
      const mockResponse = [
        [0, 0, 5],
        [0, 1, 10],
        [1, 0, 15],
      ];

      (apiClient.get as any).mockResolvedValue({ data: mockResponse });

      const result = await ChartsAPI.getHeatmapData();

      expect(apiClient.get).toHaveBeenCalledWith('/charts/heatmap');
      expect(result).toEqual(mockResponse);
    });
  });
});