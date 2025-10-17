import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpHeaders } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { APP_INITIALIZER } from '@angular/core';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import type { GraphQLFormattedError } from 'graphql';
import type { Bug } from '@pro/types';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { TokenStorageService } from './services/token-storage.service';
import { AuthInitService } from './core/services/auth-init.service';

type BugCollection = { bugs: Bug[]; total: number };

const EMPTY_BUG_COLLECTION: BugCollection = { bugs: [], total: 0 };

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    HttpLink,
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const http = httpLink.create({ uri: environment.graphqlUrl });

      const debugLink = new ApolloLink((operation, forward) => {
        console.log('🔍 [Apollo] 开始 GraphQL 请求:', {
          operationName: operation.operationName,
          variables: operation.variables,
          query: operation.query.loc?.source.body
        });
        console.log('🌐 [Apollo] 请求上下文:', operation.getContext());

        return forward(operation);
      });

      const authLink = new ApolloLink((operation, forward) => {
        // 直接从 localStorage 获取 token，使用正确的 key
        const token = localStorage.getItem('access_token');

        console.log('🔐 [Apollo AuthLink] 设置请求头:', {
          hasToken: !!token,
          tokenKey: 'access_token'
        });

        if (token) {
          const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
          operation.setContext(({ headers: existingHeaders = new HttpHeaders() }) => ({
            headers: existingHeaders.set('Authorization', `Bearer ${token}`)
          }));
        }

        return forward(operation);
      });

      const errorLink = new ErrorLink(({ error, operation }) => {
        console.error('🔍 [Apollo ErrorLink] 错误详情:', {
          operationName: operation?.operationName,
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          networkError: (error as any)?.networkError,
          graphQLErrors: (error as any)?.graphQLErrors
        });

        if (CombinedGraphQLErrors.is(error)) {
          error.errors.forEach((graphError: GraphQLFormattedError) => {
            const locations =
              graphError.locations?.map(({ line, column }) => `${line}:${column}`).join(', ') ?? 'n/a';
            const path = Array.isArray(graphError.path)
              ? graphError.path.map((segment) => segment.toString()).join(' > ')
              : 'n/a';
            console.error(`[GraphQL error] ${graphError.message} (locations: ${locations}, path: ${path})`);
          });
        } else if (error) {
          console.error('[Network error]', error);
        }
      });

      return {
        link: ApolloLink.from([debugLink, authLink, errorLink, http]),
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                bugs: {
                  keyArgs: ['filters'],
                  merge(existing: BugCollection = EMPTY_BUG_COLLECTION, incoming?: BugCollection | null) {
                    return incoming ?? existing;
                  },
                },
              },
            },
          },
        }),
        defaultOptions: {
          watchQuery: {
            fetchPolicy: 'cache-and-network',
            errorPolicy: 'all',
          },
          query: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          },
          mutate: {
            errorPolicy: 'all',
          },
        },
      };
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (authInitService: AuthInitService) => () => authInitService.initializeAuth(),
      deps: [AuthInitService],
      multi: true
    }
  ]
};
