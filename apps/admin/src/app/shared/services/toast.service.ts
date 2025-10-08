import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts$ = new BehaviorSubject<Toast[]>([]);

  get toasts(): Observable<Toast[]> {
    return this.toasts$.asObservable();
  }

  success(message: string, duration: number = 3000): void {
    this.add('success', message, duration);
  }

  error(message: string, duration: number = 3000): void {
    this.add('error', message, duration);
  }

  warning(message: string, duration: number = 3000): void {
    this.add('warning', message, duration);
  }

  info(message: string, duration: number = 3000): void {
    this.add('info', message, duration);
  }

  remove(id: string): void {
    const current = this.toasts$.value;
    this.toasts$.next(current.filter(toast => toast.id !== id));
  }

  private add(type: Toast['type'], message: string, duration: number): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration
    };
    this.toasts$.next([...this.toasts$.value, toast]);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
