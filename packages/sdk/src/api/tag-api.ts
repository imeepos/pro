import { HttpClient } from '../client/http-client.js';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag.types.js';
import { PageResponse } from '../types/common.types.js';

interface TagListPayload {
  items: Tag[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

/**
 * 标签 API 接口封装
 */
export class TagApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 查询标签列表
   */
  async getTags(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<PageResponse<Tag>> {
    const response = await this.http.get<TagListPayload>('/api/tags', params);

    return {
      data: response.items,
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
      totalPages: response.totalPages,
    };
  }

  /**
   * 获取标签详情
   */
  async getTagById(id: number): Promise<Tag> {
    return this.http.get<Tag>(`/api/tags/${id}`);
  }

  /**
   * 创建标签
   */
  async createTag(dto: CreateTagDto): Promise<Tag> {
    return this.http.post<Tag>('/api/tags', dto);
  }

  /**
   * 更新标签
   */
  async updateTag(id: number, dto: UpdateTagDto): Promise<Tag> {
    return this.http.put<Tag>(`/api/tags/${id}`, dto);
  }

  /**
   * 删除标签
   */
  async deleteTag(id: number): Promise<void> {
    return this.http.delete(`/api/tags/${id}`);
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit = 20): Promise<Tag[]> {
    return this.http.get<Tag[]>('/api/tags/popular', { limit });
  }
}
