import { Injectable, inject } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { LoginDto, RegisterDto, AuthResponse, User } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  LoginDocument,
  LoginMutation,
  LoginMutationVariables,
  LogoutDocument,
  LogoutMutation,
  LogoutMutationVariables,
  MeDocument,
  MeQuery,
  MeQueryVariables,
  RefreshTokenDocument,
  RefreshTokenMutation,
  RefreshTokenMutationVariables,
  RegisterDocument,
  RegisterMutation,
  RegisterMutationVariables
} from '../core/graphql/generated/graphql';
import { toDomainUser } from '../core/utils/user-mapper';

type GraphqlAuthPayload = LoginMutation['login'];
type GraphqlUser = GraphqlAuthPayload['user'];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private gateway = inject(GraphqlGateway);

  login(dto: LoginDto): Observable<AuthResponse> {
    return from(
      this.gateway.request<LoginMutation, LoginMutationVariables>(LoginDocument, {
        input: dto
      })
    ).pipe(map(result => this.toAuthResponse(result.login)));
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return from(
      this.gateway.request<RegisterMutation, RegisterMutationVariables>(RegisterDocument, {
        input: dto
      })
    ).pipe(map(result => this.toAuthResponse(result.register)));
  }

  logout(): Observable<void> {
    return from(
      this.gateway.request<LogoutMutation, LogoutMutationVariables>(LogoutDocument)
    ).pipe(map(() => void 0));
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return from(
      this.gateway.request<RefreshTokenMutation, RefreshTokenMutationVariables>(RefreshTokenDocument, {
        input: { refreshToken }
      })
    ).pipe(map(result => this.toAuthResponse(result.refreshToken)));
  }

  getProfile(): Observable<User> {
    return from(this.gateway.request<MeQuery, MeQueryVariables>(MeDocument)).pipe(
      map(result => this.toUser(result.me))
    );
  }

  private toAuthResponse(payload: GraphqlAuthPayload): AuthResponse {
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: toDomainUser(payload.user)
    };
  }

  private toUser(user: GraphqlUser): User {
    return toDomainUser(user);
  }
}
