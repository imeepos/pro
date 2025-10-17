import { Event, EventStatus } from '@pro/sdk';
import { EventStatus as GqlEventStatus } from '../graphql/generated/graphql';

export interface GraphqlEvent {
  id: string;
  eventName: string;
  summary?: string | null;
  status: GqlEventStatus;
  occurTime: string;
  province: string;
  city: string;
  district?: string | null;
  street?: string | null;
  locationText?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  eventTypeId: string;
  industryTypeId: string;
  createdAt: string;
  updatedAt: string;
}

export function toDomainEvent(event: GraphqlEvent): Event {
  return {
    id: event.id,
    eventTypeId: event.eventTypeId,
    industryTypeId: event.industryTypeId,
    eventName: event.eventName,
    summary: event.summary ?? undefined,
    occurTime: event.occurTime,
    province: event.province,
    city: event.city,
    district: event.district ?? undefined,
    street: event.street ?? undefined,
    locationText: event.locationText ?? undefined,
    longitude: event.longitude ?? undefined,
    latitude: event.latitude ?? undefined,
    status: toDomainEventStatus(event.status),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export function toDomainEventStatus(status: GqlEventStatus): EventStatus {
  switch (status) {
    case GqlEventStatus.Draft:
      return EventStatus.DRAFT;
    case GqlEventStatus.Published:
      return EventStatus.PUBLISHED;
    case GqlEventStatus.Archived:
      return EventStatus.ARCHIVED;
    default:
      return EventStatus.DRAFT;
  }
}

export function toGraphqlEventStatus(status?: EventStatus): GqlEventStatus | undefined {
  if (status === undefined) {
    return undefined;
  }

  switch (status) {
    case EventStatus.DRAFT:
      return GqlEventStatus.Draft;
    case EventStatus.PUBLISHED:
      return GqlEventStatus.Published;
    case EventStatus.ARCHIVED:
      return GqlEventStatus.Archived;
    default:
      return undefined;
  }
}
