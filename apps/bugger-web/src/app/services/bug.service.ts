import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Bug, CreateBugDto, UpdateBugDto, BugFilters, BugComment, CreateBugCommentDto, BugError, BugOperationResult } from '@pro/types';
import {
  GET_BUGS,
  GET_BUG,
  GET_BUG_STATISTICS,
  CREATE_BUG,
  UPDATE_BUG,
  REMOVE_BUG,
  UPDATE_BUG_STATUS,
  ASSIGN_BUG,
  GET_BUG_COMMENTS,
  ADD_BUG_COMMENT,
} from '../graphql/operations';

@Injectable({
  providedIn: 'root'
})
export class BugService {
  constructor(private apollo: Apollo) {}

  getBugs(filters?: BugFilters): Observable<BugOperationResult<{ bugs: Bug[]; total: number }>> {
    return this.apollo
      .query<{ bugs: { bugs: Bug[]; total: number } }>({
        query: GET_BUGS,
        variables: { filters: this.buildFiltersInput(filters) },
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.bugs || { bugs: [], total: 0 }
        })),
        catchError(error => this.handleError(error))
      );
  }

  getBug(id: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .query<{ bug: Bug }>({
        query: GET_BUG,
        variables: { id },
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.bug!
        })),
        catchError(error => this.handleError(error))
      );
  }

  createBug(bug: CreateBugDto): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<{ createBug: Bug }>({
        mutation: CREATE_BUG,
        variables: { input: bug },
        refetchQueries: ['GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.createBug!
        })),
        catchError(error => this.handleError(error))
      );
  }

  updateBug(id: string, updates: UpdateBugDto): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<{ updateBug: Bug }>({
        mutation: UPDATE_BUG,
        variables: { id, input: updates },
        refetchQueries: ['GetBug', 'GetBugs'],
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.updateBug!
        })),
        catchError(error => this.handleError(error))
      );
  }

  deleteBug(id: string): Observable<BugOperationResult<void>> {
    return this.apollo
      .mutate<{ removeBug: boolean }>({
        mutation: REMOVE_BUG,
        variables: { id },
        refetchQueries: ['GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(response => ({
          success: response.data?.removeBug || false
        })),
        catchError(error => this.handleError(error))
      );
  }

  updateBugStatus(id: string, status: string, comment?: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<{ updateBugStatus: Bug }>({
        mutation: UPDATE_BUG_STATUS,
        variables: { id, input: { status, comment } },
        refetchQueries: ['GetBug', 'GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.updateBugStatus!
        })),
        catchError(error => this.handleError(error))
      );
  }

  assignBug(id: string, assigneeId: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<{ assignBug: Bug }>({
        mutation: ASSIGN_BUG,
        variables: { id, input: { assigneeId } },
        refetchQueries: ['GetBug', 'GetBugs'],
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.assignBug!
        })),
        catchError(error => this.handleError(error))
      );
  }

  getComments(bugId: string): Observable<BugOperationResult<BugComment[]>> {
    return this.apollo
      .query<{ bugComments: BugComment[] }>({
        query: GET_BUG_COMMENTS,
        variables: { bugId },
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.bugComments || []
        })),
        catchError(error => this.handleError(error))
      );
  }

  addComment(bugId: string, comment: CreateBugCommentDto): Observable<BugOperationResult<BugComment>> {
    return this.apollo
      .mutate<{ addBugComment: BugComment }>({
        mutation: ADD_BUG_COMMENT,
        variables: { bugId, input: comment },
        refetchQueries: ['GetBug'],
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.addBugComment!
        })),
        catchError(error => this.handleError(error))
      );
  }

  uploadAttachment(bugId: string, file: File): Observable<BugOperationResult<any>> {
    // 附件上传暂时保留 HTTP 实现，因为 GraphQL 文件上传需要特殊处理
    console.warn('Attachment upload not yet implemented with GraphQL');
    return of({
      success: false,
      error: BugError.create('Attachment upload not yet implemented', 'NOT_IMPLEMENTED')
    });
  }

  getStatistics(): Observable<BugOperationResult<any>> {
    return this.apollo
      .query<{ bugStatistics: any }>({
        query: GET_BUG_STATISTICS,
      })
      .pipe(
        map(response => ({
          success: true,
          data: response.data?.bugStatistics
        })),
        catchError(error => this.handleError(error))
      );
  }

  private handleError(error: any): Observable<BugOperationResult<never>> {
    const bugError = BugError.fromGraphQLError(error);
    return of({
      success: false,
      error: bugError
    });
  }

  private buildFiltersInput(filters?: BugFilters): any {
    if (!filters) return null;

    return {
      page: filters.page,
      limit: filters.limit,
      status: filters.status,
      priority: filters.priority,
      category: filters.category,
      reporterId: filters.reporterId,
      assigneeId: filters.assigneeId,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };
  }
}
