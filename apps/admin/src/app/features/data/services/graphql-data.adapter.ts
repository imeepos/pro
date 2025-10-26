import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { GraphQLService } from '../shared/services/graphql.service';
import {
  RawDataListQuery,
  RawDataStatisticsQuery,
  RawDataByIdQuery,
  SearchRawDataQuery,
  RawDataBySourceTypeQuery,
  RecentRawDataQuery,
  RawDataFilterInput,
  SourceType,
  ProcessingStatus
} from '../../../core/graphql/generated/graphql';

import {
  RawData,
  RawDataFilters,
  RawDataListResponse,
  RawDataStats,
  ProcessingStatus as LegacyProcessingStatus,
  SourceType as LegacySourceType,
  SourcePlatform as LegacySourcePlatform
} from '@pro/types';

@Injectable({
  providedIn: 'root'
})
export class GraphQLDataAdapter {
  constructor(private graphql: GraphQLService) {}

  private readonly rawDataListQuery = `
    query RawDataList($filter: RawDataFilterInput) {
      rawDataList(filter: $filter) {
        items {
          _id
          sourceType
          sourceUrl
          contentPreview
          contentHash
          status
          createdAt
          processedAt
        }
        total
        page
        pageSize
        totalPages
        hasNext
        hasPrevious
      }
    }
  `;

  private readonly rawDataStatisticsQuery = `
    query RawDataStatistics {
      rawDataStatistics {
        pending
        processing
        completed
        failed
        total
        successRate
      }
    }
  `;

  private readonly rawDataByIdQuery = `
    query RawDataById($id: String!) {
      rawDataById(id: $id) {
        _id
        sourceType
        sourceUrl
        contentPreview
        contentHash
        status
        createdAt
        processedAt
        errorMessage
        metadata
      }
    }
  `;

  private readonly searchRawDataQuery = `
    query SearchRawData($keyword: String!, $page: Int, $pageSize: Int) {
      searchRawData(keyword: $keyword, page: $page, pageSize: $pageSize) {
        items {
          _id
          sourceType
          sourceUrl
          contentPreview
          contentHash
          status
          createdAt
          processedAt
        }
        total
        page
        pageSize
        totalPages
        hasNext
        hasPrevious
      }
    }
  `;

  private readonly rawDataBySourceTypeQuery = `
    query RawDataBySourceType($sourceType: SourceType!, $page: Int, $pageSize: Int) {
      rawDataBySourceType(sourceType: $sourceType, page: $page, pageSize: $pageSize) {
        items {
          _id
          sourceType
          sourceUrl
          contentPreview
          contentHash
          status
          createdAt
          processedAt
        }
        total
        page
        pageSize
        totalPages
        hasNext
        hasPrevious
      }
    }
  `;

  private readonly recentRawDataQuery = `
    query RecentRawData($limit: Int, $sourceType: SourceType) {
      recentRawData(limit: $limit, sourceType: $sourceType) {
        _id
        sourceType
        sourceUrl
        contentPreview
        contentHash
        status
        createdAt
        processedAt
      }
    }
  `;

  findAll(filters?: RawDataFilters): Observable<RawDataListResponse> {
    const graphqlFilter = this.transformFiltersToGraphQL(filters);

    return this.graphql.query<RawDataListQuery>(
      this.rawDataListQuery,
      { variables: { filter: graphqlFilter } }
    ).pipe(
      map(response => {
        if (!response.data?.rawDataList) {
          throw new Error('Invalid response structure');
        }

        const { rawDataList } = response.data;
        return {
          data: rawDataList.items.map((item: any) => this.transformItemToLegacyFormat(item)),
          total: rawDataList.total,
          page: rawDataList.page,
          limit: rawDataList.pageSize,
          totalPages: rawDataList.totalPages
        };
      }),
      catchError(error => {
        console.error('GraphQL findAll error:', error);
        throw error;
      })
    );
  }

  getStats(): Observable<RawDataStats> {
    return this.graphql.query<RawDataStatisticsQuery>(
      this.rawDataStatisticsQuery
    ).pipe(
      map(response => {
        if (!response.data?.rawDataStatistics) {
          throw new Error('Invalid statistics response');
        }

        const stats = response.data.rawDataStatistics;
        return {
          total: stats.total,
          pending: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          failed: stats.failed,
          totalSize: 0,
          successRate: stats.successRate,
          byPlatform: {} as Record<LegacySourcePlatform, number>,
          byType: {} as Record<LegacySourceType, number>
        };
      }),
      catchError(error => {
        console.error('GraphQL getStats error:', error);
        throw error;
      })
    );
  }

  findOne(id: string): Observable<RawData> {
    return this.graphql.query<RawDataByIdQuery>(
      this.rawDataByIdQuery,
      { variables: { id } }
    ).pipe(
      map(response => {
        if (!response.data?.rawDataById) {
          throw new Error(`RawData with id ${id} not found`);
        }

        return this.transformItemToLegacyFormat(response.data.rawDataById);
      }),
      catchError(error => {
        console.error('GraphQL findOne error:', error);
        throw error;
      })
    );
  }

  search(keyword: string, page = 1, pageSize = 50): Observable<RawData[]> {
    return this.graphql.query<SearchRawDataQuery>(
      this.searchRawDataQuery,
      { variables: { keyword, page, pageSize } }
    ).pipe(
      map(response => {
        if (!response.data?.searchRawData) {
          return [];
        }

        return response.data.searchRawData.items.map((item: any) =>
          this.transformItemToLegacyFormat(item)
        );
      }),
      catchError(error => {
        console.error('GraphQL search error:', error);
        return of([]);
      })
    );
  }

  findByStatus(status: LegacyProcessingStatus, limit = 100): Observable<RawData[]> {
    const graphqlStatus = this.transformStatusToGraphQL(status);
    const filter: RawDataFilterInput = {
      status: graphqlStatus,
      pageSize: limit
    };

    return this.graphql.query<RawDataListQuery>(
      this.rawDataListQuery,
      { variables: { filter } }
    ).pipe(
      map(response => {
        if (!response.data?.rawDataList) {
          return [];
        }

        return response.data.rawDataList.items.map((item: any) =>
          this.transformItemToLegacyFormat(item)
        );
      }),
      catchError(error => {
        console.error('GraphQL findByStatus error:', error);
        return of([]);
      })
    );
  }

  findBySourceType(sourceType: LegacySourceType, page = 1, pageSize = 100): Observable<RawData[]> {
    const graphqlSourceType = this.transformSourceTypeToGraphQL(sourceType);

    return this.graphql.query<RawDataBySourceTypeQuery>(
      this.rawDataBySourceTypeQuery,
      { variables: { sourceType: graphqlSourceType, page, pageSize } }
    ).pipe(
      map(response => {
        if (!response.data?.rawDataBySourceType) {
          return [];
        }

        return response.data.rawDataBySourceType.items.map((item: any) =>
          this.transformItemToLegacyFormat(item)
        );
      }),
      catchError(error => {
        console.error('GraphQL findBySourceType error:', error);
        return of([]);
      })
    );
  }

  getRecent(limit = 10, sourceType?: LegacySourceType): Observable<RawData[]> {
    const graphqlSourceType = sourceType ? this.transformSourceTypeToGraphQL(sourceType) : undefined;

    return this.graphql.query<RecentRawDataQuery>(
      this.recentRawDataQuery,
      { variables: { limit, sourceType: graphqlSourceType } }
    ).pipe(
      map(response => {
        if (!response.data?.recentRawData) {
          return [];
        }

        return response.data.recentRawData.map((item: any) =>
          this.transformItemToLegacyFormat(item)
        );
      }),
      catchError(error => {
        console.error('GraphQL getRecent error:', error);
        return of([]);
      })
    );
  }

  private transformFiltersToGraphQL(filters?: RawDataFilters): RawDataFilterInput | undefined {
    if (!filters) return undefined;

    const graphqlFilter: RawDataFilterInput = {};

    if (filters.search) {
      graphqlFilter.keyword = filters.search;
    }

    if (filters.processingStatus) {
      graphqlFilter.status = this.transformStatusToGraphQL(filters.processingStatus);
    }

    if (filters.sourceType) {
      graphqlFilter.sourceType = this.transformSourceTypeToGraphQL(filters.sourceType);
    }

    if (filters.sourcePlatform) {
      graphqlFilter.sourcePlatform = this.transformSourcePlatformToGraphQL(filters.sourcePlatform);
    }

    if (filters.page) {
      graphqlFilter.page = filters.page;
    }

    if (filters.limit) {
      graphqlFilter.pageSize = filters.limit;
    }

    return Object.keys(graphqlFilter).length > 0 ? graphqlFilter : undefined;
  }

  private transformItemToLegacyFormat(item: any): RawData {
    return {
      id: item._id,
      sourceUrl: item.sourceUrl,
      sourceType: this.transformSourceTypeFromGraphQL(item.sourceType),
      sourcePlatform: this.inferSourcePlatformFromType(item.sourceType),
      contentHash: item.contentHash,
      rawContent: item.rawContent || item.metadata || '',
      metadata: item.metadata ? JSON.parse(item.metadata) : {},
      processingStatus: this.transformStatusFromGraphQL(item.status),
      processingResult: item.processingResult || undefined,
      processingError: item.errorMessage || undefined,
      processedAt: item.processedAt ? new Date(item.processedAt) : undefined,
      fileSize: item.fileSize || 0,
      isValid: item.isValid !== false,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt || item.createdAt),
      userId: item.userId || 0
    };
  }

  private transformStatusToGraphQL(status: LegacyProcessingStatus): ProcessingStatus {
    const statusMap: Record<LegacyProcessingStatus, ProcessingStatus> = {
      [LegacyProcessingStatus.PENDING]: ProcessingStatus.Pending,
      [LegacyProcessingStatus.PROCESSING]: ProcessingStatus.Processing,
      [LegacyProcessingStatus.COMPLETED]: ProcessingStatus.Completed,
      [LegacyProcessingStatus.FAILED]: ProcessingStatus.Failed
    };
    return statusMap[status] || ProcessingStatus.Pending;
  }

  private transformStatusFromGraphQL(status: ProcessingStatus): LegacyProcessingStatus {
    const statusMap: Record<ProcessingStatus, LegacyProcessingStatus> = {
      [ProcessingStatus.Pending]: LegacyProcessingStatus.PENDING,
      [ProcessingStatus.Processing]: LegacyProcessingStatus.PROCESSING,
      [ProcessingStatus.Completed]: LegacyProcessingStatus.COMPLETED,
      [ProcessingStatus.Failed]: LegacyProcessingStatus.FAILED
    };
    return statusMap[status] || LegacyProcessingStatus.PENDING;
  }

  private transformSourceTypeToGraphQL(type: LegacySourceType): SourceType {
    const typeMap: Record<LegacySourceType, SourceType> = {
      [LegacySourceType.WEIBO_HTML]: SourceType.WeiboHtml,
      [LegacySourceType.WEIBO_API_JSON]: SourceType.WeiboApiJson,
      [LegacySourceType.WEIBO_COMMENT]: SourceType.WeiboComment,
      [LegacySourceType.WEIBO_KEYWORD_SEARCH]: SourceType.WeiboKeywordSearch,
      [LegacySourceType.WEIBO_NOTE_DETAIL]: SourceType.WeiboNoteDetail,
      [LegacySourceType.WEIBO_CREATOR_PROFILE]: SourceType.WeiboCreatorProfile,
      [LegacySourceType.WEIBO_COMMENTS]: SourceType.WeiboComments,
      [LegacySourceType.WEIBO_USER_INFO]: SourceType.WeiboCreatorProfile,
      [LegacySourceType.WEIBO_DETAIL]: SourceType.WeiboApiJson,
      [LegacySourceType.JD]: SourceType.Jd,
      [LegacySourceType.CUSTOM]: SourceType.Custom
    };
    return typeMap[type] || SourceType.Custom;
  }

  private transformSourceTypeFromGraphQL(type: SourceType): LegacySourceType {
    const typeMap: Record<SourceType, LegacySourceType> = {
      [SourceType.WeiboHtml]: LegacySourceType.WEIBO_HTML,
      [SourceType.WeiboApiJson]: LegacySourceType.WEIBO_API_JSON,
      [SourceType.WeiboComment]: LegacySourceType.WEIBO_COMMENT,
      [SourceType.WeiboComments]: LegacySourceType.WEIBO_COMMENTS,
      [SourceType.WeiboCreatorProfile]: LegacySourceType.WEIBO_CREATOR_PROFILE,
      [SourceType.WeiboNoteDetail]: LegacySourceType.WEIBO_NOTE_DETAIL,
      [SourceType.WeiboKeywordSearch]: LegacySourceType.WEIBO_KEYWORD_SEARCH,
      [SourceType.Jd]: LegacySourceType.JD,
      [SourceType.Custom]: LegacySourceType.CUSTOM
    };
    return typeMap[type] || LegacySourceType.CUSTOM;
  }

  private transformSourcePlatformToGraphQL(platform: LegacySourcePlatform): any {
    // Note: GraphQL schema might have different platform enum
    // This would need to be adjusted based on actual GraphQL schema
    return platform;
  }

  private inferSourcePlatformFromType(sourceType: SourceType): LegacySourcePlatform {
    if (sourceType === SourceType.WeiboHtml ||
        sourceType === SourceType.WeiboApiJson ||
        sourceType === SourceType.WeiboComment) {
      return LegacySourcePlatform.WEIBO;
    }

    if (sourceType === SourceType.Jd) {
      return LegacySourcePlatform.JD;
    }

    return LegacySourcePlatform.CUSTOM;
  }
}