import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { User } from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  UpdateUserDocument,
  UpdateUserMutation,
  UpdateUserMutationVariables,
  UserDocument,
  UserQuery,
  UserQueryVariables
} from '../graphql/generated/graphql';
import { toDomainUser, toGraphqlUserStatus } from '../utils/user-mapper';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private gateway: GraphqlGateway) {}

  getUserInfo(id: string): Observable<User> {
    return from(this.gateway.request<UserQuery, UserQueryVariables>(UserDocument, { id })).pipe(
      map(result => toDomainUser(result.user))
    );
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    const input: UpdateUserMutationVariables['input'] = {
      username: data.username ?? undefined,
      email: data.email ?? undefined,
      status: toGraphqlUserStatus(data.status)
    };

    return from(
      this.gateway.request<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, {
        id,
        input
      })
    ).pipe(map(result => toDomainUser(result.updateUser)));
  }
}
