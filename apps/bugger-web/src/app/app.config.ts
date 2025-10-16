import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpHeaders } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import type { GraphQLFormattedError } from 'graphql';
import type { Bug } from '@pro/types';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

type BugCollection = { bugs: Bug[]; total: number };

const EMPTY_BUG_COLLECTION: BugCollection = { bugs: [], total: 0 };

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const http = httpLink.create({ uri: environment.graphqlEndpoint });

      const authLink = new ApolloLink((operation, forward) => {
        operation.setContext({
          headers: new HttpHeaders().set('X-API-Key', environment.apiKey),
        });
        return forward(operation);
      });

      const errorLink = new ErrorLink(({ error }) => {
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
        link: ApolloLink.from([authLink, errorLink, http]),
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
  ]
};
