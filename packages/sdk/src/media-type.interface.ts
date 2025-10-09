/**
 * 媒体类型实体接口
 */
export interface MediaType {
  id: number;
  typeCode: string;
  typeName: string;
  description?: string;
  sort: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建媒体类型 DTO
 */
export interface CreateMediaTypeDto {
  typeCode: string;
  typeName: string;
  description?: string;
  sort?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * 更新媒体类型 DTO
 */
export interface UpdateMediaTypeDto {
  typeCode?: string;
  typeName?: string;
  description?: string;
  sort?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * 查询媒体类型 DTO
 */
export interface QueryMediaTypeDto {
  page?: number;
  pageSize?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  keyword?: string;
}
