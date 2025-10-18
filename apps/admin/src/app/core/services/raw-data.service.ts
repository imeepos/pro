import { Injectable } from '@angular/core';
import { GraphQLClient } from 'graphql-request';
import type {
  RawDataListQuery,
  RawDataByIdQuery,
  RawDataStatisticsQuery,
  RawDataTrendQuery,
  RawDataBySourceTypeQuery,
  SearchRawDataQuery,
  RecentRawDataQuery,
  RawDataFilterInput,
  SourceType,
  TrendDataInput
} from '../graphql/generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class RawDataService {
  private readonly client: GraphQLClient;
  private readonly baseQuery = `
    fragment RawDataCore on RawDataItem {
      _id
      sourceType
      sourceUrl
      contentPreview
      contentHash
      status
      createdAt
      processedAt
    }

    fragment RawDataWithError on RawDataItem {
      ...RawDataCore
      errorMessage
      metadata
    }
  `;

  constructor() {
    this.client = new GraphQLClient('/graphql');
  }

  async getRawDataList(filter?: RawDataFilterInput): Promise<RawDataListQuery['rawDataList']> {
    const query = `
      ${this.baseQuery}
      query RawDataList($filter: RawDataFilterInput) {
        rawDataList(filter: $filter) {
          items {
            ...RawDataCore
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

    const result = await this.client.request<RawDataListQuery>(query, { filter });
    return result.rawDataList;
  }

  async getRawDataById(id: string): Promise<RawDataByIdQuery['rawDataById']> {
    const query = `
      ${this.baseQuery}
      query RawDataById($id: String!) {
        rawDataById(id: $id) {
          ...RawDataWithError
        }
      }
    `;

    const result = await this.client.request<RawDataByIdQuery>(query, { id });
    return result.rawDataById;
  }

  async getRawDataStatistics(): Promise<RawDataStatisticsQuery['rawDataStatistics']> {
    const query = `
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

    const result = await this.client.request<RawDataStatisticsQuery>(query);
    return result.rawDataStatistics;
  }

  async getRawDataTrend(input?: TrendDataInput): Promise<RawDataTrendQuery['rawDataTrend']> {
    const query = `
      query RawDataTrend($input: TrendDataInput) {
        rawDataTrend(input: $input) {
          timestamp
          count
          status
        }
      }
    `;

    const result = await this.client.request<RawDataTrendQuery>(query, { input });
    return result.rawDataTrend;
  }

  async getRawDataBySourceType(
    sourceType: SourceType,
    page?: number,
    pageSize?: number
  ): Promise<RawDataBySourceTypeQuery['rawDataBySourceType']> {
    const query = `
      ${this.baseQuery}
      query RawDataBySourceType($sourceType: SourceType!, $page: Int, $pageSize: Int) {
        rawDataBySourceType(sourceType: $sourceType, page: $page, pageSize: $pageSize) {
          items {
            ...RawDataCore
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

    const result = await this.client.request<RawDataBySourceTypeQuery>(query, {
      sourceType,
      page,
      pageSize
    });
    return result.rawDataBySourceType;
  }

  async searchRawData(
    keyword: string,
    page?: number,
    pageSize?: number
  ): Promise<SearchRawDataQuery['searchRawData']> {
    const query = `
      ${this.baseQuery}
      query SearchRawData($keyword: String!, $page: Int, $pageSize: Int) {
        searchRawData(keyword: $keyword, page: $page, pageSize: $pageSize) {
          items {
            ...RawDataCore
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

    const result = await this.client.request<SearchRawDataQuery>(query, {
      keyword,
      page,
      pageSize
    });
    return result.searchRawData;
  }

  async getRecentRawData(
    limit?: number,
    sourceType?: SourceType
  ): Promise<RecentRawDataQuery['recentRawData']> {
    const query = `
      ${this.baseQuery}
      query RecentRawData($limit: Int, $sourceType: SourceType) {
        recentRawData(limit: $limit, sourceType: $sourceType) {
          ...RawDataCore
        }
      }
    `;

    const result = await this.client.request<RecentRawDataQuery>(query, {
      limit,
      sourceType
    });
    return result.recentRawData;
  }
}