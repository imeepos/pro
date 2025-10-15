import { GraphQLClient } from '../client/graphql-client.js';
import {
  IndustryType,
  CreateIndustryTypeDto,
  UpdateIndustryTypeDto,
} from '../types/industry-type.types.js';

interface IndustryTypesResponse {
  industryTypes: IndustryType[];
}

interface IndustryTypeResponse {
  industryType: IndustryType;
}

interface CreateIndustryTypeResponse {
  createIndustryType: IndustryType;
}

interface UpdateIndustryTypeResponse {
  updateIndustryType: IndustryType;
}

interface RemoveIndustryTypeResponse {
  removeIndustryType: boolean;
}

export class IndustryTypeApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getIndustryTypes(): Promise<IndustryType[]> {
    const query = `
      query IndustryTypes {
        industryTypes {
          id
          name
          description
          icon
          color
          sortOrder
          isActive
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<IndustryTypesResponse>(query);
    return response.industryTypes;
  }

  async getIndustryTypeById(id: number): Promise<IndustryType> {
    const query = `
      query IndustryType($id: ID!) {
        industryType(id: $id) {
          id
          name
          description
          icon
          color
          sortOrder
          isActive
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<IndustryTypeResponse>(query, { id: id.toString() });
    return response.industryType;
  }

  async createIndustryType(dto: CreateIndustryTypeDto): Promise<IndustryType> {
    const mutation = `
      mutation CreateIndustryType($input: CreateIndustryTypeDto!) {
        createIndustryType(input: $input) {
          id
          name
          description
          icon
          color
          sortOrder
          isActive
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<CreateIndustryTypeResponse>(mutation, { input: dto });
    return response.createIndustryType;
  }

  async updateIndustryType(id: number, dto: UpdateIndustryTypeDto): Promise<IndustryType> {
    const mutation = `
      mutation UpdateIndustryType($id: ID!, $input: UpdateIndustryTypeDto!) {
        updateIndustryType(id: $id, input: $input) {
          id
          name
          description
          icon
          color
          sortOrder
          isActive
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<UpdateIndustryTypeResponse>(mutation, {
      id: id.toString(),
      input: dto
    });
    return response.updateIndustryType;
  }

  async deleteIndustryType(id: number): Promise<void> {
    const mutation = `
      mutation RemoveIndustryType($id: ID!) {
        removeIndustryType(id: $id)
      }
    `;

    await this.client.mutate<RemoveIndustryTypeResponse>(mutation, { id: id.toString() });
  }
}
