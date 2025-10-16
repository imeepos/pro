import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { LoggedInUsersStats } from '@pro/types';
import { WeiboStatsDataSource } from '@pro/components';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  WeiboAccountStatsDocument,
  WeiboAccountStatsQuery,
  WeiboAccountStatsQueryVariables
} from '../graphql/generated/graphql';

@Injectable({ providedIn: 'root' })
export class WeiboDataService implements WeiboStatsDataSource {
  constructor(private gateway: GraphqlGateway) {}

  fetchLoggedInUsers(): Observable<LoggedInUsersStats> {
    return from(
      this.gateway.request<WeiboAccountStatsQuery, WeiboAccountStatsQueryVariables>(
        WeiboAccountStatsDocument
      )
    ).pipe(map(result => result.weiboAccountStats));
  }
}
