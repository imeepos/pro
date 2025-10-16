import {
  EventMapPoint as DomainEventMapPoint,
  EventMapQueryParams,
  EventQueryParams,
  EventStatus as DomainEventStatus,
  EventSummary as DomainEventSummary
} from '@pro/types';
import {
  EventMapQueryInput,
  EventQueryInput,
  EventStatus as GqlEventStatus
} from '../graphql/generated/graphql';

type GraphqlEventLike = {
  id: string;
  eventName: string;
  summary?: string | null;
  occurTime: string;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  status: GqlEventStatus;
  eventTypeId?: string | null;
  industryTypeId?: string | null;
};

type GraphqlPointLike = GraphqlEventLike & {
  longitude: number;
  latitude: number;
};

export function toDomainEventSummary(event: GraphqlEventLike): DomainEventSummary {
  return {
    id: event.id,
    eventName: event.eventName,
    summary: event.summary ?? undefined,
    occurTime: event.occurTime,
    province: event.province ?? undefined,
    city: event.city ?? undefined,
    district: event.district ?? undefined,
    street: event.street ?? undefined,
    status: toDomainEventStatus(event.status),
    eventTypeId: String(event.eventTypeId ?? ''),
    industryTypeId: String(event.industryTypeId ?? '')
  };
}

export function toDomainEventPoint(point: GraphqlPointLike): DomainEventMapPoint {
  return {
    id: point.id,
    eventName: point.eventName,
    summary: point.summary ?? undefined,
    occurTime: point.occurTime,
    province: point.province ?? undefined,
    city: point.city ?? undefined,
    district: point.district ?? undefined,
    street: point.street ?? undefined,
    longitude: point.longitude,
    latitude: point.latitude,
    status: toDomainEventStatus(point.status),
    eventTypeId: point.eventTypeId ?? undefined,
    industryTypeId: point.industryTypeId ?? undefined
  };
}

export function toDomainEventStatus(status: GqlEventStatus): DomainEventStatus {
  switch (status) {
    case GqlEventStatus.Published:
      return DomainEventStatus.PUBLISHED;
    case GqlEventStatus.Archived:
      return DomainEventStatus.ARCHIVED;
    case GqlEventStatus.Draft:
    default:
      return DomainEventStatus.DRAFT;
  }
}

export function toGraphqlEventStatus(
  status?: DomainEventStatus
): GqlEventStatus | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case DomainEventStatus.PUBLISHED:
      return GqlEventStatus.Published;
    case DomainEventStatus.ARCHIVED:
      return GqlEventStatus.Archived;
    case DomainEventStatus.DRAFT:
      return GqlEventStatus.Draft;
    default:
      return undefined;
  }
}

export function toGraphqlEventMapFilter(
  params: EventMapQueryParams
): EventMapQueryInput {
  return {
    city: params.city ?? undefined,
    district: params.district ?? undefined,
    endTime: params.endTime ?? undefined,
    eventTypeId: params.eventTypeId ?? undefined,
    industryTypeId: params.industryTypeId ?? undefined,
    keyword: params.keyword ?? undefined,
    province: params.province ?? undefined,
    startTime: params.startTime ?? undefined,
    status: toGraphqlEventStatus(params.status),
    tagIds: params.tagIds ?? undefined
  };
}

export function toGraphqlEventFilter(
  params: EventQueryParams
): EventQueryInput {
  return {
    city: params.city ?? undefined,
    district: params.district ?? undefined,
    endTime: params.endTime ?? undefined,
    eventTypeId: params.eventTypeId ?? undefined,
    industryTypeId: params.industryTypeId ?? undefined,
    keyword: params.keyword ?? undefined,
    page: params.page ?? undefined,
    pageSize: params.pageSize ?? undefined,
    province: params.province ?? undefined,
    startTime: params.startTime ?? undefined,
    status: toGraphqlEventStatus(params.status),
    tagIds: params.tagIds ?? undefined
  };
}
