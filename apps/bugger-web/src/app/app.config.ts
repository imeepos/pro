import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const http = httpLink.create({ uri: environment.graphqlEndpoint });

      const errorLink = onError((error: any) => {
        if (error.graphQLErrors) {
          error.graphQLErrors.forEach((err: any) =>
            console.error(
              `[GraphQL error]: Message: ${err.message}, Location: ${err.locations}, Path: ${err.path}`
            )
          );
        }
        if (error.networkError) {
          console.error(`[Network error]: ${error.networkError}`);
        }
      });

      return {
        link: ApolloLink.from([errorLink, http]),
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                bugs: {
                  keyArgs: ['filters'],
                  merge(existing = { bugs: [], total: 0 }, incoming: any) {
                    return incoming;
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