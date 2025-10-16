import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { LoggedInUsersStats } from '@pro/types';
import { WeiboStatsDataSource } from '@pro/components';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';

const WEIBO_STATS_QUERY = /* GraphQL */ `
  query WeiboAccountStats {
    weiboAccountStats {
      total
      todayNew
      online
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class WeiboDataService implements WeiboStatsDataSource {
  constructor(private gateway: GraphqlGateway) {}

  fetchLoggedInUsers(): Observable<LoggedInUsersStats> {
    return from(
      this.gateway.request<{ weiboAccountStats: LoggedInUsersStats }>(WEIBO_STATS_QUERY)
    ).pipe(map(result => result.weiboAccountStats));
  }
}
