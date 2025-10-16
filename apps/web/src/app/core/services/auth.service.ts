import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { LoginDto, RegisterDto, AuthResponse, User } from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';

const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginDto!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const REGISTER_MUTATION = /* GraphQL */ `
  mutation Register($input: RegisterDto!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const REFRESH_MUTATION = /* GraphQL */ `
  mutation Refresh($input: RefreshTokenDto!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const LOGOUT_MUTATION = /* GraphQL */ `
  mutation Logout {
    logout
  }
`;

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private gateway: GraphqlGateway) {}

  login(dto: LoginDto): Observable<AuthResponse> {
    return from(
      this.gateway.request<{ login: AuthResponse }>(LOGIN_MUTATION, { input: dto })
    ).pipe(map(result => result.login));
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return from(
      this.gateway.request<{ register: AuthResponse }>(REGISTER_MUTATION, { input: dto })
    ).pipe(map(result => result.register));
  }

  logout(): Observable<void> {
    return from(
      this.gateway.request<{ logout: boolean }>(LOGOUT_MUTATION)
    ).pipe(map(() => void 0));
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return from(
      this.gateway.request<{ refreshToken: AuthResponse }>(REFRESH_MUTATION, {
        input: { refreshToken }
      })
    ).pipe(map(result => result.refreshToken));
  }

  getProfile(): Observable<User> {
    return from(this.gateway.request<{ me: User }>(ME_QUERY)).pipe(map(result => result.me));
  }
}
