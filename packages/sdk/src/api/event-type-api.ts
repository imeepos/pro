import { GraphQLClient } from '../client/graphql-client.js';
import {
  EventType,
  CreateEventTypeDto,
  UpdateEventTypeDto,
} from '../types/event-type.types.js';

interface EventTypesResponse {
  eventTypes: EventType[];
}

interface EventTypeResponse {
  eventType: EventType;
}

interface CreateEventTypeResponse {
  createEventType: EventType;
}

interface UpdateEventTypeResponse {
  updateEventType: EventType;
}

interface RemoveEventTypeResponse {
  removeEventType: boolean;
}

export class EventTypeApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getEventTypes(): Promise<EventType[]> {
    const query = `
      query EventTypes {
        eventTypes {
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

    const response = await this.client.query<EventTypesResponse>(query);
    return response.eventTypes;
  }

  async getEventTypeById(id: number): Promise<EventType> {
    const query = `
      query EventType($id: ID!) {
        eventType(id: $id) {
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

    const response = await this.client.query<EventTypeResponse>(query, { id: id.toString() });
    return response.eventType;
  }

  async createEventType(dto: CreateEventTypeDto): Promise<EventType> {
    const mutation = `
      mutation CreateEventType($input: CreateEventTypeDto!) {
        createEventType(input: $input) {
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

    const response = await this.client.mutate<CreateEventTypeResponse>(mutation, { input: dto });
    return response.createEventType;
  }

  async updateEventType(id: number, dto: UpdateEventTypeDto): Promise<EventType> {
    const mutation = `
      mutation UpdateEventType($id: ID!, $input: UpdateEventTypeDto!) {
        updateEventType(id: $id, input: $input) {
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

    const response = await this.client.mutate<UpdateEventTypeResponse>(mutation, {
      id: id.toString(),
      input: dto
    });
    return response.updateEventType;
  }

  async deleteEventType(id: number): Promise<void> {
    const mutation = `
      mutation RemoveEventType($id: ID!) {
        removeEventType(id: $id)
      }
    `;

    await this.client.mutate<RemoveEventTypeResponse>(mutation, { id: id.toString() });
  }
}
