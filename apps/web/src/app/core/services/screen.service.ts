import { Injectable } from '@angular/core';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  DEFAULT_SCREEN_QUERY,
  PUBLISHED_SCREENS_QUERY,
  SCREEN_QUERY
} from '../graphql/screen.queries';
import {
  ScreenList,
  ScreenPage,
  normalizeScreenPage
} from '../types/screen.types';

interface PublishedScreensResponse {
  publishedScreens: {
    edges: Array<{
      node: ScreenPage;
    }>;
    totalCount: number;
  };
}

interface DefaultScreenResponse {
  defaultScreen: ScreenPage | null;
}

interface ScreenResponse {
  screen: ScreenPage | null;
}

@Injectable({
  providedIn: 'root'
})
export class ScreenService {
  constructor(private readonly gateway: GraphqlGateway) {}

  async fetchPublishedScreens(page = 1, limit = 50): Promise<ScreenList> {
    const response = await this.gateway.request<PublishedScreensResponse>(
      PUBLISHED_SCREENS_QUERY,
      { page, limit }
    );

    const edges = response.publishedScreens?.edges ?? [];
    const items = edges.map(edge => normalizeScreenPage(edge.node));
    const total = response.publishedScreens?.totalCount ?? items.length;
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
    const response = await this.gateway.request<DefaultScreenResponse>(DEFAULT_SCREEN_QUERY);

    if (!response.defaultScreen) {
      throw new Error('系统尚未配置默认大屏');
    }

    return normalizeScreenPage(response.defaultScreen);
  }

  async fetchScreen(id: string): Promise<ScreenPage> {
    const response = await this.gateway.request<ScreenResponse>(
      SCREEN_QUERY,
      { id }
    );

    if (!response.screen) {
      throw new Error('未找到指定大屏');
    }

    return normalizeScreenPage(response.screen);
  }
}
