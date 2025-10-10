import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Event, EventType, EventHistory } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventBusService {
  private eventSubject = new Subject<Event>();
  private eventHistory: EventHistory[] = [];
  private maxHistorySize = 100;

  emit(event: Event): void {
    this.eventSubject.next(event);
  }

  on(eventType: EventType, callback: (event: Event) => void): Subscription {
    return this.eventSubject
      .pipe(filter(event => event.type === eventType))
      .subscribe(callback);
  }

  onAll(callback: (event: Event) => void): Subscription {
    return this.eventSubject.subscribe(callback);
  }

  once(eventType: EventType, callback: (event: Event) => void): void {
    const subscription = this.eventSubject
      .pipe(filter(event => event.type === eventType))
      .subscribe(event => {
        callback(event);
        subscription.unsubscribe();
      });
  }

  recordHistory(event: Event, success: boolean, error?: string): void {
    this.eventHistory.push({
      event,
      success,
      error,
      timestamp: Date.now()
    });

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getHistory(limit?: number): EventHistory[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}
