import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BugFilters } from '@pro/types';

@Injectable({
  providedIn: 'root',
})
export class BugFilterStateService {
  private readonly baseFilters: BugFilters = {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  private readonly filtersSubject = new BehaviorSubject<BugFilters>({
    ...this.baseFilters,
  });

  readonly filters$ = this.filtersSubject.asObservable();

  get snapshot(): BugFilters {
    return this.filtersSubject.getValue();
  }

  update(partial: Partial<BugFilters>): void {
    const next = this.normalise({ ...this.snapshot, ...partial });
    if (!this.areEqual(this.snapshot, next)) {
      this.filtersSubject.next(next);
    }
  }

  reset(partial?: Partial<BugFilters>): void {
    const next = this.normalise({ ...this.baseFilters, ...partial });
    this.filtersSubject.next(next);
  }

  private normalise(filters: BugFilters): BugFilters {
    const refined: BugFilters = { ...filters };

    refined.search =
      refined.search && refined.search.trim().length > 0
        ? refined.search.trim()
        : undefined;

    refined.status = this.cleanArray(refined.status);
    refined.priority = this.cleanArray(refined.priority);
    refined.category = this.cleanArray(refined.category);
    refined.tagIds = this.cleanArray(refined.tagIds);

    refined.page = refined.page && refined.page > 0 ? refined.page : 1;
    refined.limit = refined.limit && refined.limit > 0 ? refined.limit : 10;
    refined.sortBy = refined.sortBy ?? 'createdAt';
    refined.sortOrder = refined.sortOrder ?? 'desc';

    return refined;
  }

  private cleanArray<T>(value?: T[] | null): T[] | undefined {
    if (!value || value.length === 0) {
      return undefined;
    }
    const filtered = value.filter(
      (item) => item !== undefined && item !== null && `${item}`.length > 0,
    );
    return filtered.length > 0 ? filtered : undefined;
  }

  private areEqual(current: BugFilters, next: BugFilters): boolean {
    const a = this.toComparable(current);
    const b = this.toComparable(next);

    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const left = a[key];
      const right = b[key];
      if (Array.isArray(left) || Array.isArray(right)) {
        if (!this.areArraysEqual(left as unknown[], right as unknown[])) {
          return false;
        }
        continue;
      }
      if (left !== right) {
        return false;
      }
    }
    return true;
  }

  private toComparable(filters: BugFilters): Record<string, unknown> {
    const comparable: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      comparable[key] = Array.isArray(value) ? [...value] : value;
    }
    return comparable;
  }

  private areArraysEqual(a?: unknown[], b?: unknown[]): boolean {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  }
}
