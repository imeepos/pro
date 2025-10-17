import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  JdAccountsQuery,
  RemoveJdAccountMutation,
  CheckJdAccountMutation
} from '../graphql/jd-account.documents';

export interface JdAccount {
  id: number;
  jdUid: string;
  jdNickname?: string;
  jdAvatar?: string;
  status: string;
  lastCheckAt?: string;
  createdAt: string;
}

export interface JdAccountCheckResult {
  accountId: number;
  jdUid: string;
  oldStatus: string;
  newStatus: string;
  statusChanged: boolean;
  message: string;
  checkedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class JdAccountService {
  constructor(private readonly graphql: GraphqlGateway) {}

  getAccounts(): Observable<{ accounts: JdAccount[] }> {
    return from(this.graphql.request(JdAccountsQuery, {})).pipe(
      map(response => ({
        accounts: response.jdAccounts.edges.map(edge => ({
          id: edge.node.id,
          jdUid: edge.node.jdUid,
          jdNickname: edge.node.jdNickname || undefined,
          jdAvatar: edge.node.jdAvatar || undefined,
          status: edge.node.status,
          lastCheckAt: edge.node.lastCheckAt || undefined,
          createdAt: edge.node.createdAt
        }))
      }))
    );
  }

  deleteAccount(accountId: number): Promise<boolean> {
    return this.graphql
      .request(RemoveJdAccountMutation, { id: accountId })
      .then(response => response.removeJdAccount);
  }

  checkAccount(accountId: number): Promise<JdAccountCheckResult> {
    return this.graphql
      .request(CheckJdAccountMutation, { id: accountId })
      .then(response => response.checkJdAccount as JdAccountCheckResult);
  }
}
