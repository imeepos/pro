import { HttpClient } from '../client/http-client.js';
import {
  IndustryType,
  CreateIndustryTypeDto,
  UpdateIndustryTypeDto,
} from '../types/industry-type.types.js';

/**
 * 行业类型 API 接口封装
 */
export class IndustryTypeApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 查询行业类型列表
   */
  async getIndustryTypes(): Promise<IndustryType[]> {
    return this.http.get<IndustryType[]>('/api/industry-types');
  }

  /**
   * 获取行业类型详情
   */
  async getIndustryTypeById(id: number): Promise<IndustryType> {
    return this.http.get<IndustryType>(`/api/industry-types/${id}`);
  }

  /**
   * 创建行业类型
   */
  async createIndustryType(dto: CreateIndustryTypeDto): Promise<IndustryType> {
    return this.http.post<IndustryType>('/api/industry-types', dto);
  }

  /**
   * 更新行业类型
   */
  async updateIndustryType(id: number, dto: UpdateIndustryTypeDto): Promise<IndustryType> {
    return this.http.put<IndustryType>(`/api/industry-types/${id}`, dto);
  }

  /**
   * 删除行业类型
   */
  async deleteIndustryType(id: number): Promise<void> {
    return this.http.delete(`/api/industry-types/${id}`);
  }
}
