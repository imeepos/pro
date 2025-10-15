import { Observable, from } from 'rxjs';
import { HttpClient } from '../client/http-client.js';
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
  BugActivityFilters,
  BugActivityListResponse,
  BugNotificationFilters,
  BugNotificationListResponse,
  CreateBugTimeTrackingDto,
  BugTimeTrackingFilters,
  BugTimeTrackingListResponse,
  BugExportOptions,
  BugBulkAction
} from '@pro/types';
import {
  BugCreateResponse,
  BugUpdateResponse,
  BugDeleteResponse,
  BugCommentCreateResponse,
  BugCommentUpdateResponse,
  BugCommentDeleteResponse,
  BugTagCreateResponse,
  BugTagUpdateResponse,
  BugTagDeleteResponse,
  BugTimeTrackingCreateResponse,
  BugBulkActionResponse,
  BugExportResponse,
  BugNotificationMarkReadResponse,
  BugStatsResponse,
  BugUploadResponse
} from '../types/bug.types.js';

export class BugApi {
  private http: HttpClient;

  constructor(baseUrl: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error('BugApi missing base url!');
    }
    this.http = new HttpClient(`${baseUrl}/api/bugs`, tokenKey);
  }

  // Bug CRUD operations
  createBug(dto: CreateBugDto): Observable<BugCreateResponse> {
    return from(this.http.post<BugCreateResponse>('', dto));
  }

  getBug(id: string): Observable<Bug> {
    return from(this.http.get<Bug>(`/${id}`));
  }

  updateBug(id: string, dto: UpdateBugDto): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${id}`, dto));
  }

  deleteBug(id: string): Observable<BugDeleteResponse> {
    return from(this.http.delete<BugDeleteResponse>(`/${id}`));
  }

  getBugs(filters: BugFilters): Observable<BugListResponse> {
    return from(this.http.get<BugListResponse>('', { params: filters }));
  }

  getBugStats(filters?: Omit<BugFilters, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Observable<BugStatsResponse> {
    return from(this.http.get<BugStatsResponse>('/stats', { params: filters }));
  }

  // Bug Comments
  getBugComments(bugId: string): Observable<BugComment[]> {
    return from(this.http.get<BugComment[]>(`/${bugId}/comments`));
  }

  addBugComment(bugId: string, dto: CreateBugCommentDto): Observable<BugCommentCreateResponse> {
    return from(this.http.post<BugCommentCreateResponse>(`/${bugId}/comments`, dto));
  }

  updateBugComment(bugId: string, commentId: string, dto: UpdateBugCommentDto): Observable<BugCommentUpdateResponse> {
    return from(this.http.patch<BugCommentUpdateResponse>(`/${bugId}/comments/${commentId}`, dto));
  }

  deleteBugComment(bugId: string, commentId: string): Observable<BugCommentDeleteResponse> {
    return from(this.http.delete<BugCommentDeleteResponse>(`/${bugId}/comments/${commentId}`));
  }

  // Bug Attachments
  uploadBugAttachment(bugId: string, file: File): Observable<BugUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return from(this.http.upload<BugUploadResponse>(`/${bugId}/attachments`, formData));
  }

  deleteBugAttachment(bugId: string, attachmentId: string): Observable<{ message: string }> {
    return from(this.http.delete<{ message: string }>(`/${bugId}/attachments/${attachmentId}`));
  }

  // Bug Tags
  getBugTags(): Observable<BugTag[]> {
    return from(this.http.get<BugTag[]>('/tags'));
  }

  createBugTag(dto: { name: string; color?: string; description?: string }): Observable<BugTagCreateResponse> {
    return from(this.http.post<BugTagCreateResponse>('/tags', dto));
  }

  updateBugTag(id: string, dto: { name?: string; color?: string; description?: string }): Observable<BugTagUpdateResponse> {
    return from(this.http.patch<BugTagUpdateResponse>(`/tags/${id}`, dto));
  }

  deleteBugTag(id: string): Observable<BugTagDeleteResponse> {
    return from(this.http.delete<BugTagDeleteResponse>(`/tags/${id}`));
  }

  // Bug Activity
  getBugActivity(bugId: string, filters?: BugActivityFilters): Observable<BugActivityListResponse> {
    return from(this.http.get<BugActivityListResponse>(`/${bugId}/activity`, { params: filters }));
  }

  getMyActivity(filters?: BugActivityFilters): Observable<BugActivityListResponse> {
    return from(this.http.get<BugActivityListResponse>('/my-activity', { params: filters }));
  }

  // Bug Time Tracking
  getBugTimeTracking(bugId: string, filters?: BugTimeTrackingFilters): Observable<BugTimeTrackingListResponse> {
    return from(this.http.get<BugTimeTrackingListResponse>(`/${bugId}/time-tracking`, { params: filters }));
  }

  addBugTimeTracking(bugId: string, dto: CreateBugTimeTrackingDto): Observable<BugTimeTrackingCreateResponse> {
    return from(this.http.post<BugTimeTrackingCreateResponse>(`/${bugId}/time-tracking`, dto));
  }

  updateTimeTracking(bugId: string, timeTrackingId: string, dto: Partial<CreateBugTimeTrackingDto>): Observable<BugTimeTrackingCreateResponse> {
    return from(this.http.patch<BugTimeTrackingCreateResponse>(`/${bugId}/time-tracking/${timeTrackingId}`, dto));
  }

  deleteTimeTracking(bugId: string, timeTrackingId: string): Observable<{ message: string }> {
    return from(this.http.delete<{ message: string }>(`/${bugId}/time-tracking/${timeTrackingId}`));
  }

  // Bug Notifications
  getBugNotifications(filters: BugNotificationFilters): Observable<BugNotificationListResponse> {
    return from(this.http.get<BugNotificationListResponse>('/notifications', { params: filters }));
  }

  markNotificationAsRead(notificationId: string): Observable<{ message: string }> {
    return from(this.http.patch<{ message: string }>(`/notifications/${notificationId}/read`, {}));
  }

  markAllNotificationsAsRead(): Observable<BugNotificationMarkReadResponse> {
    return from(this.http.patch<BugNotificationMarkReadResponse>('/notifications/read-all', {}));
  }

  deleteNotification(notificationId: string): Observable<{ message: string }> {
    return from(this.http.delete<{ message: string }>(`/notifications/${notificationId}`));
  }

  // Bug Bulk Operations
  bulkActionOnBugs(action: BugBulkAction): Observable<BugBulkActionResponse> {
    return from(this.http.post<BugBulkActionResponse>('/bulk-action', action));
  }

  // Bug Export
  exportBugs(options: BugExportOptions): Observable<BugExportResponse> {
    return from(this.http.post<BugExportResponse>('/export', options));
  }

  // Bug Assignment
  assignBugToUser(bugId: string, userId: string): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/assign`, { assigneeId: userId }));
  }

  unassignBug(bugId: string): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/unassign`, {}));
  }

  // Bug Status Changes
  changeBugStatus(bugId: string, status: string, comment?: string): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/status`, { status, comment }));
  }

  resolveBug(bugId: string, resolution: string, actualHours?: number): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/resolve`, { resolution, actualHours }));
  }

  closeBug(bugId: string, reason?: string): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/close`, { reason }));
  }

  reopenBug(bugId: string, reason: string): Observable<BugUpdateResponse> {
    return from(this.http.patch<BugUpdateResponse>(`/${bugId}/reopen`, { reason }));
  }

  // Bug Watchers
  addBugWatcher(bugId: string, userId: string): Observable<{ message: string }> {
    return from(this.http.post<{ message: string }>(`/${bugId}/watchers`, { userId }));
  }

  removeBugWatcher(bugId: string, userId: string): Observable<{ message: string }> {
    return from(this.http.delete<{ message: string }>(`/${bugId}/watchers/${userId}`));
  }

  getBugWatchers(bugId: string): Observable<{ id: string; name: string; email: string }[]> {
    return from(this.http.get<{ id: string; name: string; email: string }[]>(`/${bugId}/watchers`));
  }

  // Bug Templates
  getBugTemplates(): Observable<Array<{ id: string; name: string; template: CreateBugDto }>> {
    return from(this.http.get<Array<{ id: string; name: string; template: CreateBugDto }>>('/templates'));
  }

  createBugTemplate(dto: { name: string; template: CreateBugDto }): Observable<{ message: string; id: string }> {
    return from(this.http.post<{ message: string; id: string }>('/templates', dto));
  }

  updateBugTemplate(id: string, dto: { name?: string; template?: Partial<CreateBugDto> }): Observable<{ message: string }> {
    return from(this.http.patch<{ message: string }>(`/templates/${id}`, dto));
  }

  deleteBugTemplate(id: string): Observable<{ message: string }> {
    return from(this.http.delete<{ message: string }>(`/templates/${id}`));
  }

  // Bug Search
  searchBugs(query: string, filters?: Partial<BugFilters>): Observable<BugListResponse> {
    return from(this.http.get<BugListResponse>('/search', {
      params: { query, ...filters }
    }));
  }

  // Bug Suggestions
  getBugSuggestions(title: string, description?: string): Observable<{
    similarBugs: Bug[];
    suggestedTags: BugTag[];
    suggestedAssignee?: { id: string; name: string; email: string };
    suggestedCategory?: string;
    suggestedPriority?: string;
  }> {
    return from(this.http.post<{
      similarBugs: Bug[];
      suggestedTags: BugTag[];
      suggestedAssignee?: { id: string; name: string; email: string };
      suggestedCategory?: string;
      suggestedPriority?: string;
    }>('/suggestions', { title, description }));
  }
}