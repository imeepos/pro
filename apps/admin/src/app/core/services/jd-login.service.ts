import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { print } from 'graphql';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import { SubscriptionClient } from '../graphql/subscription-client.service';
import {
  StartJdLoginDocument,
  JdLoginEventsDocument
} from '../graphql/generated/graphql';

export interface JdLoginSession {
  sessionId: string;
  expiresAt: string;
  expired: boolean;
}

export interface JdLoginEvent {
  type: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class JdLoginService {
  constructor(
    private readonly graphql: GraphqlGateway,
    private readonly subscriptionClient: SubscriptionClient
  ) {}

  async startLogin(): Promise<JdLoginSession> {
    const response = await this.graphql.request(StartJdLoginDocument, {});
    return response.startJdLogin;
  }

  observeLoginEvents(sessionId: string): Observable<JdLoginEvent> {
    return new Observable(observer => {
      const client = this.subscriptionClient.getClient();

      const unsubscribe = client.subscribe(
        {
          query: print(JdLoginEventsDocument),
          variables: { sessionId }
        },
        {
          next: (result: any) => {
            if (result.data?.jdLoginEvents) {
              observer.next(result.data.jdLoginEvents);
            }
          },
          error: (error: Error) => observer.error(error),
          complete: () => observer.complete()
        }
      );

      return () => unsubscribe();
    });
  }
}
