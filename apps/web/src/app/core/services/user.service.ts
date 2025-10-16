import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { User } from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';

const USER_QUERY = /* GraphQL */ `
  query User($id: String!) {
    user(id: $id) {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_USER_MUTATION = /* GraphQL */ `
  mutation UpdateUser($id: String!, $input: UpdateUserDto!) {
    updateUser(id: $id, input: $input) {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private gateway: GraphqlGateway) {}

  getUserInfo(id: string): Observable<User> {
    return from(this.gateway.request<{ user: User }>(USER_QUERY, { id })).pipe(
      map(result => result.user)
    );
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    return from(
      this.gateway.request<{ updateUser: User }>(UPDATE_USER_MUTATION, {
        id,
        input: data
      })
    ).pipe(map(result => result.updateUser));
  }
}
