import { SourceType, ProcessingStatus, SourcePlatform } from './enums/raw-data.js';

export * from './enums/raw-data.js';

export interface RawData {
  id: number;
  sourceType: SourceType;
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  rawContent: string;
  metadata?: Record<string, any>;
  processingStatus: ProcessingStatus;
  processingResult?: string;
  processingError?: string;
  processedAt?: Date;
  fileSize: number;
  contentHash: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

export interface CreateRawDataSourceDto {
  sourceType: SourceType | string;
  sourceUrl: string;
  rawContent: string;
  metadata?: Record<string, any>;
}

export interface UpdateRawDataDto {
  sourceType?: SourceType;
  sourceUrl?: string;
  rawContent?: string;
  metadata?: Record<string, any>;
  processingStatus?: ProcessingStatus;
}

export interface RawDataFilters {
  search?: string;
  sourceType?: SourceType;
  sourcePlatform?: SourcePlatform;
  processingStatus?: ProcessingStatus;
  userId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'processedAt' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface RawDataListResponse {
  data: RawData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface RawDataStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalSize: number;
  avgProcessingTime?: number;
  successRate: number;
  byPlatform: Record<SourcePlatform, number>;
  byType: Record<SourceType, number>;
}
