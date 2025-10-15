import { GraphQLClient } from '../client/graphql-client.js';
import {
  Event,
  EventDetail,
  CreateEventDto,
  UpdateEventDto,
  EventQueryParams,
  EventMapPoint,
  EventMapQueryParams,
} from '../types/event.types.js';
import { PageResponse } from '../types/common.types.js';

interface EventEdge {
  node: Event;
  cursor: string;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface EventConnection {
  edges: EventEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface EventsResponse {
  events: EventConnection;
}

interface EventsForMapResponse {
  eventsForMap: EventMapPoint[];
}

interface EventsNearbyResponse {
  eventsNearby: Event[];
}

interface EventsByTagResponse {
  eventsByTag: Event[];
}

interface EventResponse {
  event: Event;
}

interface CreateEventResponse {
  createEvent: Event;
}

interface UpdateEventResponse {
  updateEvent: Event;
}

interface RemoveEventResponse {
  removeEvent: boolean;
}

interface PublishEventResponse {
  publishEvent: Event;
}

interface ArchiveEventResponse {
  archiveEvent: Event;
}

interface AddTagsToEventResponse {
  addTagsToEvent: Event;
}

interface RemoveTagFromEventResponse {
  removeTagFromEvent: boolean;
}

export class EventApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getEvents(params: EventQueryParams): Promise<PageResponse<Event>> {
    const query = `
      query Events($filter: EventQueryDto) {
        events(filter: $filter) {
          edges {
            node {
              id
              status
              eventName
              summary
              occurTime
              province
              city
              district
              street
              locationText
              longitude
              latitude
              eventTypeId
              industryTypeId
              createdBy
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

    const response = await this.client.query<EventsResponse>(query, { filter: params });
    const connection = response.events;
    const items = connection.edges.map(edge => edge.node);

    const pageSize = params.pageSize ?? 20;
    const page = params.page ?? 1;
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

  async getEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]> {
    const query = `
      query EventsForMap($filter: EventMapQueryDto) {
        eventsForMap(filter: $filter) {
          id
          eventName
          summary
          occurTime
          province
          city
          district
          street
          longitude
          latitude
          status
          eventTypeId
          industryTypeId
        }
      }
    `;

    const response = await this.client.query<EventsForMapResponse>(query, { filter: params });
    return response.eventsForMap;
  }

  async getEventById(id: string): Promise<EventDetail> {
    const query = `
      query Event($id: ID!) {
        event(id: $id) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
          eventType {
            id
            name
            description
            icon
          }
          industryType {
            id
            name
            description
            icon
          }
          tags {
            id
            name
            category
            color
          }
          attachments {
            id
            eventId
            fileName
            fileUrl
            bucketName
            objectName
            fileType
            fileSize
            mimeType
            fileMd5
            sortOrder
            createdAt
          }
        }
      }
    `;

    const response = await this.client.query<EventResponse>(query, { id });
    return response.event as EventDetail;
  }

  async createEvent(dto: CreateEventDto): Promise<Event> {
    const mutation = `
      mutation CreateEvent($input: CreateEventDto!) {
        createEvent(input: $input) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<CreateEventResponse>(mutation, { input: dto });
    return response.createEvent;
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const mutation = `
      mutation UpdateEvent($id: ID!, $input: UpdateEventDto!) {
        updateEvent(id: $id, input: $input) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<UpdateEventResponse>(mutation, { id, input: dto });
    return response.updateEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const mutation = `
      mutation RemoveEvent($id: ID!) {
        removeEvent(id: $id)
      }
    `;

    await this.client.mutate<RemoveEventResponse>(mutation, { id });
  }

  async publishEvent(id: string): Promise<Event> {
    const mutation = `
      mutation PublishEvent($id: ID!) {
        publishEvent(id: $id) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<PublishEventResponse>(mutation, { id });
    return response.publishEvent;
  }

  async archiveEvent(id: string): Promise<Event> {
    const mutation = `
      mutation ArchiveEvent($id: ID!) {
        archiveEvent(id: $id) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.mutate<ArchiveEventResponse>(mutation, { id });
    return response.archiveEvent;
  }

  async getNearbyEvents(
    longitude: number,
    latitude: number,
    radius: number
  ): Promise<Event[]> {
    const query = `
      query EventsNearby($longitude: Float!, $latitude: Float!, $radius: Float!) {
        eventsNearby(longitude: $longitude, latitude: $latitude, radius: $radius) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<EventsNearbyResponse>(query, {
      longitude,
      latitude,
      radius
    });
    return response.eventsNearby;
  }

  async getEventsByTag(tagId: string): Promise<Event[]> {
    const query = `
      query EventsByTag($tagId: ID!) {
        eventsByTag(tagId: $tagId) {
          id
          status
          eventName
          summary
          occurTime
          province
          city
          district
          street
          locationText
          longitude
          latitude
          eventTypeId
          industryTypeId
          createdBy
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.client.query<EventsByTagResponse>(query, { tagId });
    return response.eventsByTag;
  }

  async addTagsToEvent(eventId: string, tagIds: string[]): Promise<void> {
    const mutation = `
      mutation AddTagsToEvent($eventId: ID!, $tagIds: [ID!]!) {
        addTagsToEvent(eventId: $eventId, tagIds: $tagIds) {
          id
        }
      }
    `;

    await this.client.mutate<AddTagsToEventResponse>(mutation, { eventId, tagIds });
  }

  async removeTagFromEvent(eventId: string, tagId: string): Promise<void> {
    const mutation = `
      mutation RemoveTagFromEvent($eventId: ID!, $tagId: ID!) {
        removeTagFromEvent(eventId: $eventId, tagId: $tagId)
      }
    `;

    await this.client.mutate<RemoveTagFromEventResponse>(mutation, { eventId, tagId });
  }
}
