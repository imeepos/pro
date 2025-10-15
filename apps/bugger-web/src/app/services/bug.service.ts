import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timeout } from 'rxjs';
import { catchError, map, first } from 'rxjs/operators';
import { Bug, CreateBugDto, UpdateBugDto, BugFilters, BugComment, CreateBugCommentDto, ApiResponse, BugError, BugErrorType, BugOperationResult } from '@pro/types';

@Injectable({
  providedIn: 'root'
})
export class BugService {
  private readonly apiUrl = 'http://localhost:3005/api/bugs';
  private readonly requestTimeout = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  getBugs(filters?: BugFilters): Observable<BugOperationResult<{ bugs: Bug[]; total: number }>> {
    const params = filters ? this.buildQueryParams(filters) : {};
    return this.http.get<ApiResponse<{ bugs: Bug[]; total: number }>>(this.apiUrl, { params }).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data || { bugs: [], total: 0 }
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  getBug(id: string): Observable<BugOperationResult<Bug>> {
    return this.http.get<ApiResponse<Bug>>(`${this.apiUrl}/${id}`).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  createBug(bug: CreateBugDto): Observable<BugOperationResult<Bug>> {
    return this.http.post<ApiResponse<Bug>>(this.apiUrl, bug).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  updateBug(id: string, updates: UpdateBugDto): Observable<BugOperationResult<Bug>> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}`, updates).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  deleteBug(id: string): Observable<BugOperationResult<void>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: response.success
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  updateBugStatus(id: string, status: string, comment?: string): Observable<BugOperationResult<Bug>> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}/status`, { status, comment }).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  assignBug(id: string, assigneeId: string): Observable<BugOperationResult<Bug>> {
    return this.http.put<ApiResponse<Bug>>(`${this.apiUrl}/${id}/assign`, { assigneeId }).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  getComments(bugId: string): Observable<BugOperationResult<BugComment[]>> {
    return this.http.get<ApiResponse<BugComment[]>>(`${this.apiUrl}/${bugId}/comments`).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data || []
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  addComment(bugId: string, comment: CreateBugCommentDto): Observable<BugOperationResult<BugComment>> {
    return this.http.post<ApiResponse<BugComment>>(`${this.apiUrl}/${bugId}/comments`, comment).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data!
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  uploadAttachment(bugId: string, file: File): Observable<BugOperationResult<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${bugId}/attachments`, formData).pipe(
      timeout(this.requestTimeout * 2), // Longer timeout for file uploads
      map(response => ({
        success: true,
        data: response.data
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  getStatistics(): Observable<BugOperationResult<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/statistics`).pipe(
      timeout(this.requestTimeout),
      map(response => ({
        success: true,
        data: response.data
      })),
      catchError(error => this.handleRequestError(error))
    );
  }

  private handleRequestError(error: any): Observable<BugOperationResult<never>> {
    const bugError = error instanceof BugError ? error : BugError.fromHttpError(error);

    return of({
      success: false,
      error: bugError
    });
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