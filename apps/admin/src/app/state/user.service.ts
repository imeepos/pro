import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { User } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  UsersDocument,
  UsersQuery,
  UsersQueryVariables,
  UserDocument,
  UserQuery,
  UserQueryVariables,
  UpdateUserDocument,
  UpdateUserMutation,
  UpdateUserMutationVariables,
  RemoveUserDocument,
  RemoveUserMutation,
  RemoveUserMutationVariables,
  UpdateUserDto
} from '../core/graphql/generated/graphql';
import { toDomainUser, toGraphqlUserStatus } from '../core/utils/user-mapper';

@Injectable({ providedIn: 'root' })
export class UserService {
  private gateway = inject(GraphqlGateway);

  getUsers(): Observable<User[]> {
    return from(
      this.gateway.request<UsersQuery, UsersQueryVariables>(UsersDocument, {})
    ).pipe(
      map(result => result.users.map(toDomainUser)),
      catchError(error => throwError(() => error))
    );
  }

  getUserInfo(id: string): Observable<User> {
    return from(
      this.gateway.request<UserQuery, UserQueryVariables>(UserDocument, { id })
    ).pipe(
      map(result => toDomainUser(result.user)),
      catchError(error => throwError(() => error))
    );
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    const input: UpdateUserDto = {
      username: data.username,
      email: data.email,
      status: data.status ? toGraphqlUserStatus(data.status) : undefined
    };

    return from(
      this.gateway.request<UpdateUserMutation, UpdateUserMutationVariables>(
        UpdateUserDocument,
        { id, input }
      )
    ).pipe(
      map(result => toDomainUser(result.updateUser)),
      catchError(error => throwError(() => error))
    );
  }

  removeUser(id: string): Observable<boolean> {
    return from(
      this.gateway.request<RemoveUserMutation, RemoveUserMutationVariables>(
        RemoveUserDocument,
        { id }
      )
    ).pipe(
      map(result => result.removeUser),
      catchError(error => throwError(() => error))
    );
  }
}