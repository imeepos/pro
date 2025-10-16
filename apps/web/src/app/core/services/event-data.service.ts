import { Injectable } from '@angular/core';
import { EventDataSource } from '@pro/components';
import {
  EventMapPoint,
  EventMapQueryParams,
  EventQueryParams,
  EventSummary
} from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  AmapKeyDocument,
  AmapKeyQuery,
  AmapKeyQueryVariables,
  EventsDocument,
  EventsForMapDocument,
  EventsForMapQuery,
  EventsForMapQueryVariables,
  EventsQuery,
  EventsQueryVariables
} from '../graphql/generated/graphql';
import {
  toDomainEventPoint,
  toDomainEventSummary,
  toGraphqlEventFilter,
  toGraphqlEventMapFilter
} from '../utils/event-mapper';

@Injectable({ providedIn: 'root' })
export class EventDataService implements EventDataSource {
  constructor(private gateway: GraphqlGateway) {}

  fetchEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]> {
    return this.gateway
      .request<EventsForMapQuery, EventsForMapQueryVariables>(
        EventsForMapDocument,
        params ? { filter: toGraphqlEventMapFilter(params) } : undefined
      )
      .then(result => (result.eventsForMap ?? []).map(toDomainEventPoint));
  }

  async fetchEvents(params: EventQueryParams): Promise<EventSummary[]> {
    const response = await this.gateway.request<EventsQuery, EventsQueryVariables>(
      EventsDocument,
      { filter: toGraphqlEventFilter(params) }
    );

    return response.events?.edges?.map(edge => toDomainEventSummary(edge.node)) ?? [];
  }

  async fetchAmapApiKey(): Promise<string | null> {
    const result = await this.gateway.request<AmapKeyQuery, AmapKeyQueryVariables>(AmapKeyDocument);
    return result.configValue?.value ?? null;
  }
}
