/**
 * 事件类型实体
 */
export interface EventType {
  id: string;
  eventCode: string;
  eventName: string;
  description?: string;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建事件类型 DTO
 */
export interface CreateEventTypeDto {
  eventCode: string;
  eventName: string;
  description?: string;
  sortOrder?: number;
  status?: number;
}

/**
 * 更新事件类型 DTO
 */
export interface UpdateEventTypeDto extends Partial<CreateEventTypeDto> {
  id: string;
}
