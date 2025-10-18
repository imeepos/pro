import { HttpClient } from '../client/http-client.js';
import {
  RawData,
  RawDataFilters,
  RawDataListResponse,
  RawDataStats,
  CreateRawDataSourceDto,
  UpdateRawDataDto
} from '@pro/types';

export class RawDataApi {
  private client: HttpClient;

  constructor(baseUrl: string, tokenKey: string = 'access_token') {
    this.client = new HttpClient(baseUrl, tokenKey);
  }

  async findAll(filters?: RawDataFilters): Promise<RawDataListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/raw-data?${queryString}` : '/raw-data';

    return this.client.get<RawDataListResponse>(url);
  }

  async findOne(id: number): Promise<RawData> {
    return this.client.get<RawData>(`/raw-data/${id}`);
  }

  async create(dto: CreateRawDataSourceDto): Promise<RawData> {
    return this.client.post<RawData>('/raw-data', dto);
  }

  async update(id: number, dto: UpdateRawDataDto): Promise<RawData> {
    return this.client.patch<RawData>(`/raw-data/${id}`, dto);
  }

  async delete(id: number): Promise<void> {
    return this.client.delete<void>(`/raw-data/${id}`);
  }

  async process(id: number): Promise<RawData> {
    return this.client.post<RawData>(`/raw-data/${id}/process`);
  }

  async reprocess(id: number): Promise<RawData> {
    return this.client.post<RawData>(`/raw-data/${id}/reprocess`);
  }

  async getStats(): Promise<RawDataStats> {
    return this.client.get<RawDataStats>('/raw-data/stats');
  }

  async bulkDelete(ids: number[]): Promise<void> {
    return this.client.post<void>('/raw-data/bulk/delete', { ids });
  }

  async bulkProcess(ids: number[]): Promise<void> {
    return this.client.post<void>('/raw-data/bulk/process', { ids });
  }

  async validate(id: number): Promise<{ valid: boolean; errors?: string[] }> {
    return this.client.get<{ valid: boolean; errors?: string[] }>(`/raw-data/${id}/validate`);
  }

  async download(id: number, format: 'json' | 'csv' | 'xml' = 'json'): Promise<Blob> {
    return this.client.get<Blob>(`/raw-data/${id}/download?format=${format}`, {
      responseType: 'blob'
    });
  }

  async upload(file: File, metadata?: Record<string, any>): Promise<RawData> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.client.post<RawData>('/raw-data/upload', formData);
  }
}