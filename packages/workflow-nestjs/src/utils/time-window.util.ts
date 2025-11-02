export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface TimeWindowCalculationResult {
  nextWindow: TimeWindow | null;
  shouldStop: boolean;
}

export function calculateNextTimeRange(
  lastPostTime: Date,
  endDate: Date
): TimeWindowCalculationResult {
  const lastPostHour = new Date(lastPostTime);
  lastPostHour.setMinutes(0, 0, 0);

  const endHour = new Date(endDate);
  endHour.setMinutes(0, 0, 0);

  if (lastPostHour <= endHour) {
    return {
      nextWindow: null,
      shouldStop: true,
    };
  }

  const nextEnd = new Date(lastPostHour);
  nextEnd.setHours(nextEnd.getHours() - 1);

  return {
    nextWindow: {
      start: endDate,
      end: nextEnd,
    },
    shouldStop: false,
  };
}

export function shouldStopCrawling(currentTime: Date, endDate: Date): boolean {
  const currentHour = new Date(currentTime);
  currentHour.setMinutes(0, 0, 0);

  const endHour = new Date(endDate);
  endHour.setMinutes(0, 0, 0);

  return currentHour <= endHour;
}

export function normalizeToHour(date: Date): Date {
  const normalized = new Date(date);
  normalized.setMinutes(0, 0, 0);
  return normalized;
}

export function isSameHour(date1: Date, date2: Date): boolean {
  const hour1 = normalizeToHour(date1);
  const hour2 = normalizeToHour(date2);
  return hour1.getTime() === hour2.getTime();
}

export function calculateTimeWindowSize(start: Date, end: Date): number {
  const startHour = normalizeToHour(start);
  const endHour = normalizeToHour(end);
  return Math.abs(endHour.getTime() - startHour.getTime()) / (1000 * 60 * 60);
}
