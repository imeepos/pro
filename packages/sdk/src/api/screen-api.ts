import { GraphQLClient } from '../client/graphql-client.js';
import {
  ScreenPage,
  CreateScreenDto,
  UpdateScreenDto,
  ScreenListResponse,
  normalizeScreenPageData
} from '../types/screen.types.js';

const SCREEN_PAGE_FIELDS = `
  id
  name
  description
  layout {
    width
    height
    background
    grid {
      enabled
      size
    }
    cols
    rows
  }
  components {
    id
    type
    position {
      x
      y
      width
      height
      zIndex
    }
    config
    dataSource {
      type
      url
      data
      refreshInterval
    }
  }
  status
  isDefault
  createdBy
  createdAt
  updatedAt
`;

interface ScreenEdge {
  node: ScreenPage;
  cursor: string;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface ScreenConnection {
  edges: ScreenEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface ScreensResponse {
  screens: ScreenConnection;
}

interface PublishedScreensResponse {
  publishedScreens: ScreenConnection;
}

interface ScreenResponse {
  screen: ScreenPage;
}

interface DefaultScreenResponse {
  defaultScreen: ScreenPage;
}

interface CreateScreenResponse {
  createScreen: ScreenPage;
}

interface UpdateScreenResponse {
  updateScreen: ScreenPage;
}

interface RemoveScreenResponse {
  removeScreen: boolean;
}

interface CopyScreenResponse {
  copyScreen: ScreenPage;
}

interface PublishScreenResponse {
  publishScreen: ScreenPage;
}

interface DraftScreenResponse {
  draftScreen: ScreenPage;
}

interface SetDefaultScreenResponse {
  setDefaultScreen: ScreenPage;
}

export class ScreenApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error('baseUrl is required for ScreenApi');
    }
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getScreens(page = 1, limit = 20): Promise<ScreenListResponse> {
    const query = `
      query Screens($page: Int, $limit: Int) {
        screens(page: $page, limit: $limit) {
          edges {
            node {
              ${SCREEN_PAGE_FIELDS}
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.client.query<ScreensResponse>(query, { page, limit });
    const connection = response.screens;
    const items = connection.edges.map(edge => normalizeScreenPageData(edge.node));
    const total = connection.totalCount;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPublishedScreens(page = 1, limit = 20): Promise<ScreenListResponse> {
    const query = `
      query PublishedScreens($page: Int, $limit: Int) {
        publishedScreens(page: $page, limit: $limit) {
          edges {
            node {
              ${SCREEN_PAGE_FIELDS}
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.client.query<PublishedScreensResponse>(query, { page, limit });
    const connection = response.publishedScreens;
    const items = connection.edges.map(edge => normalizeScreenPageData(edge.node));
    const total = connection.totalCount;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getScreen(id: string): Promise<ScreenPage> {
    const query = `
      query Screen($id: ID!) {
        screen(id: $id) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.query<ScreenResponse>(query, { id });
    return normalizeScreenPageData(response.screen);
  }

  async createScreen(dto: CreateScreenDto): Promise<ScreenPage> {
    const mutation = `
      mutation CreateScreen($input: CreateScreenInput!) {
        createScreen(input: $input) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<CreateScreenResponse>(mutation, { input: dto });
    return normalizeScreenPageData(response.createScreen);
  }

  async updateScreen(id: string, dto: UpdateScreenDto): Promise<ScreenPage> {
    const mutation = `
      mutation UpdateScreen($id: ID!, $input: UpdateScreenInput!) {
        updateScreen(id: $id, input: $input) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<UpdateScreenResponse>(mutation, { id, input: dto });
    return normalizeScreenPageData(response.updateScreen);
  }

  async deleteScreen(id: string): Promise<void> {
    const mutation = `
      mutation RemoveScreen($id: ID!) {
        removeScreen(id: $id)
      }
    `;

    await this.client.mutate<RemoveScreenResponse>(mutation, { id });
  }

  async copyScreen(id: string): Promise<ScreenPage> {
    const mutation = `
      mutation CopyScreen($id: ID!) {
        copyScreen(id: $id) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<CopyScreenResponse>(mutation, { id });
    return normalizeScreenPageData(response.copyScreen);
  }

  async publishScreen(id: string): Promise<ScreenPage> {
    const mutation = `
      mutation PublishScreen($id: ID!) {
        publishScreen(id: $id) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<PublishScreenResponse>(mutation, { id });
    return normalizeScreenPageData(response.publishScreen);
  }

  async draftScreen(id: string): Promise<ScreenPage> {
    const mutation = `
      mutation DraftScreen($id: ID!) {
        draftScreen(id: $id) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<DraftScreenResponse>(mutation, { id });
    return normalizeScreenPageData(response.draftScreen);
  }

  async setDefaultScreen(id: string): Promise<ScreenPage> {
    const mutation = `
      mutation SetDefaultScreen($id: ID!) {
        setDefaultScreen(id: $id) {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.mutate<SetDefaultScreenResponse>(mutation, { id });
    return normalizeScreenPageData(response.setDefaultScreen);
  }

  async getDefaultScreen(): Promise<ScreenPage> {
    const query = `
      query DefaultScreen {
        defaultScreen {
          ${SCREEN_PAGE_FIELDS}
        }
      }
    `;

    const response = await this.client.query<DefaultScreenResponse>(query);
    return normalizeScreenPageData(response.defaultScreen);
  }
}
