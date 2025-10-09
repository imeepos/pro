/**
 * 行业类型实体
 */
export interface IndustryType {
  id: string;
  industryCode: string;
  industryName: string;
  description?: string;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建行业类型 DTO
 */
export interface CreateIndustryTypeDto {
  industryCode: string;
  industryName: string;
  description?: string;
  sortOrder?: number;
  status?: number;
}

/**
 * 更新行业类型 DTO
 */
export interface UpdateIndustryTypeDto extends Partial<CreateIndustryTypeDto> {
  id: string;
}
