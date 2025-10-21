import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { print } from 'graphql';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import { SubscriptionClient } from '../graphql/subscription-client.service';
import {
  StartWeiboLoginDocument,
  WeiboLoginEventsDocument
} from '../graphql/generated/graphql';

export interface WeiboLoginSession {
  sessionId: string;
  expiresAt: string;
  expired: boolean;
}

export interface WeiboLoginEvent {
  type: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WeiboLoginService {
  constructor(
    private readonly graphql: GraphqlGateway,
    private readonly subscriptionClient: SubscriptionClient
  ) {}

  async startLogin(): Promise<WeiboLoginSession> {
    const response = await this.graphql.request(StartWeiboLoginDocument, {});
    return response.startWeiboLogin;
  }

  observeLoginEvents(sessionId: string): Observable<WeiboLoginEvent> {
    return new Observable(observer => {
      const client = this.subscriptionClient.getClient();

      const unsubscribe = client.subscribe(
        {
          query: print(WeiboLoginEventsDocument),
          variables: { sessionId }
        },
        {
          next: (result: any) => {
            if (result.data?.weiboLoginEvents) {
              observer.next(result.data.weiboLoginEvents);
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
