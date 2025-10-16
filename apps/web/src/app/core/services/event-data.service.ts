import { Injectable } from '@angular/core';
import { EventDataSource } from '@pro/components';
import {
  EventMapPoint,
  EventMapQueryParams,
  EventQueryParams,
  EventSummary
} from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';

const EVENTS_FOR_MAP_QUERY = /* GraphQL */ `
  query EventsForMap($filter: EventMapQueryInput) {
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

const EVENTS_QUERY = /* GraphQL */ `
  query Events($filter: EventQueryInput) {
    events(filter: $filter) {
      edges {
        node {
          id
          eventName
          summary
          occurTime
          province
          city
          district
          street
          status
          eventTypeId
          industryTypeId
        }
      }
    }
  }
`;

const AMAP_KEY_QUERY = /* GraphQL */ `
  query AmapKey {
    configValue(type: AMAP_API_KEY) {
      value
    }
  }
`;
interface EventsForMapPayload {
  eventsForMap: EventMapPoint[];
}

interface EventsConnectionPayload {
  events: {
    edges: Array<{ node: EventSummary }>;
  };
}

interface ConfigValuePayload {
  configValue: { value?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class EventDataService implements EventDataSource {
  constructor(private gateway: GraphqlGateway) {}

  fetchEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]> {
    return this.gateway
      .request<EventsForMapPayload>(EVENTS_FOR_MAP_QUERY, params ? { filter: params } : undefined)
      .then(result => result.eventsForMap ?? []);
  }

  async fetchEvents(params: EventQueryParams): Promise<EventSummary[]> {
    const response = await this.gateway.request<EventsConnectionPayload>(EVENTS_QUERY, {
      filter: params
    });

    return response.events?.edges?.map(edge => edge.node) ?? [];
  }

  async fetchAmapApiKey(): Promise<string | null> {
    const result = await this.gateway.request<ConfigValuePayload>(AMAP_KEY_QUERY);
    return result.configValue?.value ?? null;
  }
}
