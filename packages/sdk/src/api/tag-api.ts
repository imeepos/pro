import { GraphQLClient } from '../client/graphql-client.js';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag.types.js';
import { PageResponse } from '../types/common.types.js';

interface TagEdge {
  node: Tag;
  cursor: string;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface TagConnection {
  edges: TagEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface TagsResponse {
  tags: TagConnection;
}

interface TagResponse {
  tag: Tag;
}

interface CreateTagResponse {
  createTag: Tag;
}

interface UpdateTagResponse {
  updateTag: Tag;
}

interface RemoveTagResponse {
  removeTag: boolean;
}

interface PopularTagsResponse {
  popularTags: Tag[];
}

export class TagApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getTags(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<PageResponse<Tag>> {
    const query = `
      query Tags($page: Int, $pageSize: Int, $keyword: String) {
        tags(page: $page, pageSize: $pageSize, keyword: $keyword) {
          edges {
            node {
              id
              name
              category
              color
              eventCount
              createdAt
              updatedAt
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

    const response = await this.client.query<TagsResponse>(query, params);
    const connection = response.tags;
    const items = connection.edges.map(edge => edge.node);

    const pageSize = params?.pageSize ?? 20;
    const page = params?.page ?? 1;
    const total = connection.totalCount;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getTagById(id: number): Promise<Tag> {
    const query = `
      query Tag($id: ID!) {
        tag(id: $id) {
          id
          name
          category
          color
          eventCount
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<TagResponse>(query, { id: id.toString() });
    return response.tag;
  }

  async createTag(dto: CreateTagDto): Promise<Tag> {
    const mutation = `
      mutation CreateTag($input: CreateTagDto!) {
        createTag(input: $input) {
          id
          name
          category
          color
          eventCount
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<CreateTagResponse>(mutation, { input: dto });
    return response.createTag;
  }

  async updateTag(id: number, dto: UpdateTagDto): Promise<Tag> {
    const mutation = `
      mutation UpdateTag($id: ID!, $input: UpdateTagDto!) {
        updateTag(id: $id, input: $input) {
          id
          name
          category
          color
          eventCount
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<UpdateTagResponse>(mutation, {
      id: id.toString(),
      input: dto
    });
    return response.updateTag;
  }

  async deleteTag(id: number): Promise<void> {
    const mutation = `
      mutation RemoveTag($id: ID!) {
        removeTag(id: $id)
      }
    `;

    await this.client.mutate<RemoveTagResponse>(mutation, { id: id.toString() });
  }

  async getPopularTags(limit = 20): Promise<Tag[]> {
    const query = `
      query PopularTags($limit: Int) {
        popularTags(limit: $limit) {
          id
          name
          category
          color
          eventCount
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<PopularTagsResponse>(query, { limit });
    return response.popularTags;
  }
}
