import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Bug,
  CreateBugDto,
  UpdateBugDto,
  BugFilters,
  BugComment,
  CreateBugCommentDto,
  BugError,
  BugErrorType,
  BugOperationResult,
} from '@pro/types';
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

type StatusKey = 'open' | 'in_progress' | 'resolved' | 'closed' | 'rejected' | 'reopened';
type PriorityKey = 'low' | 'medium' | 'high' | 'critical';
type CategoryKey =
  | 'functional'
  | 'performance'
  | 'security'
  | 'ui_ux'
  | 'integration'
  | 'data'
  | 'configuration'
  | 'documentation';

type BugListPayload = { bugs: Bug[]; total: number } | null;
type BugResponse = { bug: Bug | null };
type BugCommentsResponse = { bugComments: BugComment[] | null };
type RemoveBugResponse = { removeBug: boolean | null };
type BugStatisticsResponse = {
  bugStatistics: {
    total: number;
    byStatus: Record<StatusKey, number>;
    byPriority: Record<PriorityKey, number>;
    byCategory: Record<CategoryKey, number>;
  } | null;
};

interface BugStatisticsSnapshot {
  total: number;
  byStatus: Record<StatusKey, number>;
  byPriority: Record<PriorityKey, number>;
  byCategory: Record<CategoryKey, number>;
}

type CreateBugMutationResult = { createBug: Bug | null };
type UpdateBugMutationResult = { updateBug: Bug | null };
type UpdateBugStatusMutationResult = { updateBugStatus: Bug | null };
type AssignBugMutationResult = { assignBug: Bug | null };
type AddBugCommentMutationResult = { addBugComment: BugComment | null };

const EMPTY_BUG_STATISTICS: BugStatisticsSnapshot = {
  total: 0,
  byStatus: {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    rejected: 0,
    reopened: 0,
  },
  byPriority: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  },
  byCategory: {
    functional: 0,
    performance: 0,
    security: 0,
    ui_ux: 0,
    integration: 0,
    data: 0,
    configuration: 0,
    documentation: 0,
  },
};

@Injectable({
  providedIn: 'root',
})
export class BugService {
  constructor(private apollo: Apollo) {}

  getBugs(filters?: BugFilters): Observable<BugOperationResult<{ bugs: Bug[]; total: number }>> {
    return this.apollo
      .query<{ bugs: BugListPayload }>({
        query: GET_BUGS,
        variables: { filters: this.buildFiltersInput(filters) },
      })
      .pipe(
        map(({ data }) => ({
          success: true,
          data: this.normaliseBugList(data?.bugs ?? null),
        })),
        catchError((error) => this.handleError<{ bugs: Bug[]; total: number }>(error))
      );
  }

  getBug(id: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .query<BugResponse>({
        query: GET_BUG,
        variables: { id },
      })
      .pipe(
        map(({ data }) => this.wrapResult(data?.bug, '未找到对应的 Bug', BugErrorType.NOT_FOUND)),
        catchError((error) => this.handleError<Bug>(error))
      );
  }

  createBug(bug: CreateBugDto): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<CreateBugMutationResult>({
        mutation: CREATE_BUG,
        variables: { input: bug },
        refetchQueries: ['GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(({ data }) => this.wrapResult(data?.createBug ?? null, '创建 Bug 失败，请稍后重试', BugErrorType.SERVER_ERROR)),
        catchError((error) => this.handleError<Bug>(error))
      );
  }

  updateBug(id: string, updates: UpdateBugDto): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<UpdateBugMutationResult>({
        mutation: UPDATE_BUG,
        variables: { id, input: updates },
        refetchQueries: ['GetBug', 'GetBugs'],
      })
      .pipe(
        map(({ data }) => this.wrapResult(data?.updateBug ?? null, '更新 Bug 失败，请稍后重试', BugErrorType.SERVER_ERROR)),
        catchError((error) => this.handleError<Bug>(error))
      );
  }

  deleteBug(id: string): Observable<BugOperationResult<void>> {
    return this.apollo
      .mutate<RemoveBugResponse>({
        mutation: REMOVE_BUG,
        variables: { id },
        refetchQueries: ['GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(({ data }) => {
          if (data?.removeBug) {
            return { success: true } as BugOperationResult<void>;
          }
          return {
            success: false,
            error: BugError.create('删除 Bug 失败，请稍后重试', BugErrorType.SERVER_ERROR),
          };
        }),
        catchError((error) => this.handleError<void>(error))
      );
  }

  updateBugStatus(id: string, status: string, comment?: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<UpdateBugStatusMutationResult>({
        mutation: UPDATE_BUG_STATUS,
        variables: { id, input: { status, comment } },
        refetchQueries: ['GetBug', 'GetBugs', 'GetBugStatistics'],
      })
      .pipe(
        map(({ data }) =>
          this.wrapResult(data?.updateBugStatus ?? null, '更新 Bug 状态失败，请稍后重试', BugErrorType.SERVER_ERROR)
        ),
        catchError((error) => this.handleError<Bug>(error))
      );
  }

  assignBug(id: string, assigneeId: string): Observable<BugOperationResult<Bug>> {
    return this.apollo
      .mutate<AssignBugMutationResult>({
        mutation: ASSIGN_BUG,
        variables: { id, input: { assigneeId } },
        refetchQueries: ['GetBug', 'GetBugs'],
      })
      .pipe(
        map(({ data }) =>
          this.wrapResult(data?.assignBug ?? null, '指派 Bug 失败，请稍后重试', BugErrorType.SERVER_ERROR)
        ),
        catchError((error) => this.handleError<Bug>(error))
      );
  }

  getComments(bugId: string): Observable<BugOperationResult<BugComment[]>> {
    return this.apollo
      .query<BugCommentsResponse>({
        query: GET_BUG_COMMENTS,
        variables: { bugId },
      })
      .pipe(
        map(({ data }) => ({
          success: true,
          data: this.normaliseComments(data?.bugComments ?? null),
        })),
        catchError((error) => this.handleError<BugComment[]>(error))
      );
  }

  addComment(bugId: string, comment: CreateBugCommentDto): Observable<BugOperationResult<BugComment>> {
    return this.apollo
      .mutate<AddBugCommentMutationResult>({
        mutation: ADD_BUG_COMMENT,
        variables: { bugId, input: comment },
        refetchQueries: ['GetBug'],
      })
      .pipe(
        map(({ data }) =>
          this.wrapResult(data?.addBugComment ?? null, '创建评论失败，请稍后重试', BugErrorType.SERVER_ERROR)
        ),
        catchError((error) => this.handleError<BugComment>(error))
      );
  }

  uploadAttachment(_bugId: string, _file: File): Observable<BugOperationResult<never>> {
    console.warn('Attachment upload not yet implemented with GraphQL');
    return of({
      success: false,
      error: BugError.create('附件上传暂未实现', BugErrorType.UNKNOWN_ERROR),
    });
  }

  getStatistics(): Observable<BugOperationResult<BugStatisticsSnapshot>> {
    return this.apollo
      .query<BugStatisticsResponse>({
        query: GET_BUG_STATISTICS,
      })
      .pipe(
        map(({ data }) => ({
          success: true,
          data: this.normaliseStatistics(data?.bugStatistics ?? null),
        })),
        catchError((error) => this.handleError<BugStatisticsSnapshot>(error))
      );
  }

  private normaliseBugList(payload: BugListPayload): { bugs: Bug[]; total: number } {
    if (!payload) {
      return { bugs: [], total: 0 };
    }
    return {
      bugs: [...payload.bugs],
      total: payload.total,
    };
  }

  private normaliseComments(comments: BugComment[] | null): BugComment[] {
    return comments ? [...comments] : [];
  }

  private normaliseStatistics(stats: BugStatisticsResponse['bugStatistics']): BugStatisticsSnapshot {
    if (!stats) {
      return {
        total: EMPTY_BUG_STATISTICS.total,
        byStatus: { ...EMPTY_BUG_STATISTICS.byStatus },
        byPriority: { ...EMPTY_BUG_STATISTICS.byPriority },
        byCategory: { ...EMPTY_BUG_STATISTICS.byCategory },
      };
    }

    return {
      total: stats.total,
      byStatus: { ...EMPTY_BUG_STATISTICS.byStatus, ...stats.byStatus },
      byPriority: { ...EMPTY_BUG_STATISTICS.byPriority, ...stats.byPriority },
      byCategory: { ...EMPTY_BUG_STATISTICS.byCategory, ...stats.byCategory },
    };
  }

  private wrapResult<T>(value: T | null | undefined, message: string, errorType: BugErrorType): BugOperationResult<T> {
    if (value === null || value === undefined) {
      return {
        success: false,
        error: BugError.create(message, errorType),
      };
    }

    return {
      success: true,
      data: value,
    };
  }

  private handleError<T>(error: unknown): Observable<BugOperationResult<T>> {
    const bugError = BugError.fromGraphQLError(error);
    return of({
      success: false,
      error: bugError,
    });
  }

  private buildFiltersInput(filters?: BugFilters): Partial<BugFilters> | null {
    if (!filters) {
      return null;
    }

    const definedEntries = Object.entries(filters).reduce<Partial<BugFilters>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        (acc as Record<string, unknown>)[key] = value;
      }
      return acc;
    }, {});

    return Object.keys(definedEntries).length > 0 ? definedEntries : null;
  }
}
