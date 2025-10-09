/**
 * 标签实体
 */
export interface Tag {
  id: string;
  tagName: string;
  tagColor: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建标签 DTO
 */
export interface CreateTagDto {
  tagName: string;
  tagColor?: string;
}

/**
 * 更新标签 DTO
 */
export interface UpdateTagDto {
  id: string;
  tagName?: string;
  tagColor?: string;
}
