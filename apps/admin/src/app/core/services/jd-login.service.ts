import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import { SubscriptionClient } from '../graphql/subscription-client.service';
import { StartJdLoginMutation, JdLoginEventsSubscription } from '../graphql/jd-account.documents';

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
    const response = await this.graphql.request(StartJdLoginMutation, {});
    return response.startJdLogin;
  }

  observeLoginEvents(sessionId: string): Observable<JdLoginEvent> {
    return new Observable(observer => {
      const client = this.subscriptionClient.getClient();

      const unsubscribe = client.subscribe(
        {
          query: JdLoginEventsSubscription.toString(),
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
