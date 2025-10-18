import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SubscriptionClient as ISubscriptionClient } from '@pro/components';
import { SubscriptionClient } from './subscription-client.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionClientAdapter implements ISubscriptionClient {
  constructor(private readonly client: SubscriptionClient) {}

  subscribe<TData = any>(
    operation: { query: string; variables?: Record<string, any> }
  ): Observable<TData> {
    return new Observable<TData>(subscriber => {
      const client = this.client.getClient();

      const unsubscribe = client.subscribe<TData>(
        {
          query: operation.query,
          variables: operation.variables
        },
        {
          next: (result) => {
            if (result.data) {
              subscriber.next(result.data);
            }
          },
          error: (error) => {
            subscriber.error(error);
          },
          complete: () => {
            subscriber.complete();
          }
        }
      );

      return () => {
        unsubscribe();
      };
    });
  }
}
