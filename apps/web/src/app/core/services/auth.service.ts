import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { LoginDto, RegisterDto, AuthResponse, User } from '@pro/types';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
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
  RefreshDocument,
  RefreshMutation,
  RefreshMutationVariables,
  RegisterDocument,
  RegisterMutation,
  RegisterMutationVariables
} from '../graphql/generated/graphql';
import { toDomainUser } from '../utils/user-mapper';

type GraphqlAuthPayload = LoginMutation['login'];
type GraphqlUser = GraphqlAuthPayload['user'];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private gateway: GraphqlGateway) {}

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
      this.gateway.request<RefreshMutation, RefreshMutationVariables>(RefreshDocument, {
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
