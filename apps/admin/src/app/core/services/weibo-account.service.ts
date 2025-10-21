import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  WeiboAccountsDocument,
  RemoveWeiboAccountDocument,
  CheckWeiboAccountDocument
} from '../graphql/generated/graphql';

export interface WeiboAccount {
  id: string;
  uid: string;
  nickname: string;
  avatar?: string;
  status: string;
  lastCheckAt?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeiboAccountService {
  constructor(private readonly graphql: GraphqlGateway) {}

  getAccounts(): Observable<{ accounts: WeiboAccount[] }> {
    return from(this.graphql.request(WeiboAccountsDocument, {})).pipe(
      map(response => ({
        accounts: response.weiboAccounts.edges.map(edge => ({
          id: edge.node.id,
          uid: edge.node.uid,
          nickname: edge.node.nickname,
          avatar: edge.node.avatar || undefined,
          status: edge.node.status,
          lastCheckAt: edge.node.lastCheckAt || undefined,
          createdAt: edge.node.createdAt,
          updatedAt: edge.node.updatedAt
        }))
      }))
    );
  }

  deleteAccount(accountId: number): Promise<boolean> {
    return this.graphql
      .request(RemoveWeiboAccountDocument, { id: accountId })
      .then(response => response.removeWeiboAccount);
  }

  checkAccount(accountId: number): Promise<boolean> {
    return this.graphql
      .request(CheckWeiboAccountDocument, { id: accountId })
      .then(response => response.checkWeiboAccount);
  }
}
