import { GraphQLClient } from '../client/graphql-client.js';
import { User } from '@pro/types';
import { fromPromise } from '../utils/observable-adapter.js';
import { Observable } from 'rxjs';

interface UsersResponse {
  users: User[];
}

interface UserResponse {
  user: User;
}

interface UpdateUserResponse {
  updateUser: User;
}

interface RemoveUserResponse {
  removeUser: boolean;
}

export class UserApi {
  private client: GraphQLClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error(`UserApi missing base url!`);
    }
    this.baseUrl = baseUrl;
    this.client = new GraphQLClient(this.baseUrl, tokenKey);
  }

  getUserInfo(id: string): Observable<User> {
    const query = `
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

    const promise = this.client.query<UserResponse>(query, { id }).then((response) => response.user);
    return fromPromise(promise);
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    const mutation = `
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

    const promise = this.client
      .mutate<UpdateUserResponse>(mutation, { id, input: data })
      .then((response) => response.updateUser);
    return fromPromise(promise);
  }

  getUsers(): Observable<User[]> {
    const query = `
      query Users {
        users {
          id
          username
          email
          status
          createdAt
          updatedAt
        }
      }
    `;

    const promise = this.client.query<UsersResponse>(query).then((response) => response.users);
    return fromPromise(promise);
  }

  removeUser(id: string): Observable<boolean> {
    const mutation = `
      mutation RemoveUser($id: String!) {
        removeUser(id: $id)
      }
    `;

    const promise = this.client.mutate<RemoveUserResponse>(mutation, { id }).then((response) => response.removeUser);
    return fromPromise(promise);
  }
}
