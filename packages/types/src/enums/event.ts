export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export function isValidEventStatus(value: string): value is EventStatus {
  return Object.values(EventStatus).includes(value as EventStatus);
}

export function numberToEventStatus(value: number): EventStatus {
  switch (value) {
    case 0:
      return EventStatus.DRAFT;
    case 1:
      return EventStatus.PUBLISHED;
    case 2:
      return EventStatus.ARCHIVED;
    default:
      throw new Error(`Invalid EventStatus number: ${value}`);
  }
}

export function eventStatusToNumber(status: EventStatus): number {
  switch (status) {
    case EventStatus.DRAFT:
      return 0;
    case EventStatus.PUBLISHED:
      return 1;
    case EventStatus.ARCHIVED:
      return 2;
    default:
      throw new Error(`Unknown EventStatus: ${status}`);
  }
}
