import {
  Bug,
  BugComment,
  BugTag,
  CreateBugDto,
  UpdateBugDto,
  CreateBugCommentDto,
  UpdateBugCommentDto,
  BugFilters,
  BugListResponse,
  BugStats,
  BugActivity,
  BugActivityFilters,
  BugActivityListResponse,
  BugNotification,
  BugNotificationFilters,
  BugNotificationListResponse,
  BugTimeTracking,
  CreateBugTimeTrackingDto,
  BugTimeTrackingFilters,
  BugTimeTrackingListResponse,
  BugExportOptions,
  BugBulkAction
} from '@pro/types';

export type {
  Bug,
  BugComment,
  BugTag,
  CreateBugDto,
  UpdateBugDto,
  CreateBugCommentDto,
  UpdateBugCommentDto,
  BugFilters,
  BugListResponse,
  BugStats,
  BugActivity,
  BugActivityFilters,
  BugActivityListResponse,
  BugNotification,
  BugNotificationFilters,
  BugNotificationListResponse,
  BugTimeTracking,
  CreateBugTimeTrackingDto,
  BugTimeTrackingFilters,
  BugTimeTrackingListResponse,
  BugExportOptions,
  BugBulkAction
};

export interface BugUploadResponse {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface BugCreateResponse {
  bug: Bug;
  message: string;
}

export interface BugUpdateResponse {
  bug: Bug;
  message: string;
}

export interface BugDeleteResponse {
  message: string;
  deletedId: string;
}

export interface BugCommentCreateResponse {
  comment: BugComment;
  message: string;
}

export interface BugCommentUpdateResponse {
  comment: BugComment;
  message: string;
}

export interface BugCommentDeleteResponse {
  message: string;
  deletedId: string;
}

export interface BugTagCreateResponse {
  tag: BugTag;
  message: string;
}

export interface BugTagUpdateResponse {
  tag: BugTag;
  message: string;
}

export interface BugTagDeleteResponse {
  message: string;
  deletedId: string;
}

export interface BugTimeTrackingCreateResponse {
  timeTracking: BugTimeTracking;
  message: string;
}

export interface BugBulkActionResponse {
  message: string;
  affectedCount: number;
  failedIds?: string[];
}

export interface BugExportResponse {
  downloadUrl: string;
  filename: string;
  size: number;
  expiresAt: string;
}

export interface BugNotificationMarkReadResponse {
  message: string;
  markedCount: number;
}

export interface BugStatsResponse {
  stats: BugStats;
  period: {
    start: string;
    end: string;
  };
}