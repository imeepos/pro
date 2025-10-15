import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Bug, CreateBugDto, UpdateBugDto, BugFilters, BugComment, CreateBugCommentDto, ApiResponse } from '@pro/types';

@Injectable({
  providedIn: 'root'
})
export class BugService {
  private readonly apiUrl = 'http://localhost:3001/api/bugs';

  constructor(private http: HttpClient) {}

  getBugs(filters?: BugFilters): Observable<{ bugs: Bug[]; total: number }> {
    const params = filters ? this.buildQueryParams(filters) : {};
    return this.http.get<ApiResponse<{ bugs: Bug[]; total: number }>>(this.apiUrl, { params }).pipe(
      map(response => response.data || { bugs: [], total: 0 }),
      catchError(error => {
        console.error('获取Bug列表失败:', error);
        return of({ bugs: [], total: 0 });
      })
    );
  }

  getBug(id: string): Observable<Bug | null> {
    return this.http.get<ApiResponse<Bug>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('获取Bug详情失败:', error);
        return of(null);
      })
    );
  }

  createBug(bug: CreateBugDto): Observable<Bug | null> {
    return this.http.post<ApiResponse<Bug>>(this.apiUrl, bug).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('创建Bug失败:', error);
        return of(null);
      })
    );
  }

  updateBug(id: string, updates: UpdateBugDto): Observable<Bug | null> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}`, updates).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('更新Bug失败:', error);
        return of(null);
      })
    );
  }

  deleteBug(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('删除Bug失败:', error);
        return of(false);
      })
    );
  }

  updateBugStatus(id: string, status: string, comment?: string): Observable<Bug | null> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}/status`, { status, comment }).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('更新Bug状态失败:', error);
        return of(null);
      })
    );
  }

  assignBug(id: string, assigneeId: string): Observable<Bug | null> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}/assign`, { assigneeId }).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('分配Bug失败:', error);
        return of(null);
      })
    );
  }

  getComments(bugId: string): Observable<BugComment[]> {
    return this.http.get<ApiResponse<BugComment[]>>(`${this.apiUrl}/${bugId}/comments`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('获取评论失败:', error);
        return of([]);
      })
    );
  }

  addComment(bugId: string, comment: CreateBugCommentDto): Observable<BugComment | null> {
    return this.http.post<ApiResponse<BugComment>>(`${this.apiUrl}/${bugId}/comments`, comment).pipe(
      map(response => response.data ?? null),
      catchError(error => {
        console.error('添加评论失败:', error);
        return of(null);
      })
    );
  }

  uploadAttachment(bugId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${bugId}/attachments`, formData).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('上传附件失败:', error);
        return of(null);
      })
    );
  }

  getStatistics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/statistics`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('获取统计信息失败:', error);
        return of({
          total: 0,
          byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
          byPriority: { low: 0, medium: 0, high: 0, critical: 0 }
        });
      })
    );
  }

  private buildQueryParams(filters: BugFilters): any {
    const params: any = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
    if (filters.priority && filters.priority.length > 0) params.priority = filters.priority.join(',');
    if (filters.category && filters.category.length > 0) params.category = filters.category.join(',');
    if (filters.reporterId) params.reporterId = filters.reporterId;
    if (filters.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters.search) params.search = filters.search;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }
}