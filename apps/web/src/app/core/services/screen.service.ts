import { Injectable } from '@angular/core';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  DefaultScreenDocument,
  DefaultScreenQuery,
  PublishedScreensDocument,
  PublishedScreensQuery,
  PublishedScreensQueryVariables,
  ScreenDocument,
  ScreenQuery,
  ScreenQueryVariables
} from '../graphql/generated/graphql';
import {
  ScreenList,
  ScreenPage,
  normalizeScreenPage
} from '../types/screen.types';

@Injectable({
  providedIn: 'root'
})
export class ScreenService {
  constructor(private readonly gateway: GraphqlGateway) {}

  async fetchPublishedScreens(page = 1, limit = 50): Promise<ScreenList> {
    const response = await this.gateway.request<
      PublishedScreensQuery,
      PublishedScreensQueryVariables
    >(PublishedScreensDocument, { page, limit });

    const edges = response.publishedScreens.edges ?? [];
    const items = edges.map(edge => normalizeScreenPage(edge.node));
    const total = response.publishedScreens.totalCount ?? items.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }

  async fetchDefaultScreen(): Promise<ScreenPage> {
    const response = await this.gateway.request<DefaultScreenQuery>(DefaultScreenDocument);

    return normalizeScreenPage(response.defaultScreen);
  }

  async fetchScreen(id: string): Promise<ScreenPage> {
    const response = await this.gateway.request<ScreenQuery, ScreenQueryVariables>(
      ScreenDocument,
      { id }
    );

    return normalizeScreenPage(response.screen);
  }
}
