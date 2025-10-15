import { Observable, from } from 'rxjs';
import { GraphQLClient } from '../client/graphql-client.js';
import { IAuthService } from '../auth.interface.js';
import { LoginDto, RegisterDto, AuthResponse, UserProfile } from '@pro/types';

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

interface MeResponse {
  me: UserProfile;
}

interface RegisterResponse {
  register: AuthPayload;
}

interface LoginResponse {
  login: AuthPayload;
}

interface RefreshResponse {
  refreshToken: AuthPayload;
}

interface LogoutResponse {
  logout: boolean;
}

export class AuthApi implements IAuthService {
  private client: GraphQLClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error(`AuthApi missing base url!`);
    }
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    const mutation = `
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

    return from(
      this.client.mutate<LoginResponse>(mutation, { input: dto }).then((response) => ({
        accessToken: response.login.accessToken,
        refreshToken: response.login.refreshToken,
        user: response.login.user,
      }))
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    const mutation = `
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

    return from(
      this.client.mutate<RegisterResponse>(mutation, { input: dto }).then((response) => ({
        accessToken: response.register.accessToken,
        refreshToken: response.register.refreshToken,
        user: response.register.user,
      }))
    );
  }

  logout(): Observable<void> {
    const mutation = `
      mutation Logout {
        logout
      }
    `;

    return from(
      this.client.mutate<LogoutResponse>(mutation).then(() => undefined)
    );
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    const mutation = `
      mutation RefreshToken($input: RefreshTokenDto!) {
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

    return from(
      this.client
        .mutate<RefreshResponse>(mutation, { input: { refreshToken } })
        .then((response) => ({
          accessToken: response.refreshToken.accessToken,
          refreshToken: response.refreshToken.refreshToken,
          user: response.refreshToken.user,
        }))
    );
  }

  getProfile(): Observable<UserProfile> {
    const query = `
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

    return from(
      this.client.query<MeResponse>(query).then((response) => response.me)
    );
  }
}
