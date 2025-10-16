import { ClientError, GraphQLClient } from 'graphql-request';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { GraphqlGateway } from './graphql-gateway.service';
import { TokenStorageService } from '../services/token-storage.service';

class TokenStorageStub implements Pick<TokenStorageService, 'getToken'> {
  token: string | null = 'mock-token';

  getToken(): string | null {
    return this.token;
  }
}

const sampleDocument = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SampleOperation' },
      selectionSet: { kind: 'SelectionSet', selections: [] }
    }
  ]
} as unknown as TypedDocumentNode<any, Record<string, unknown>>;

const createClientError = (status: number): ClientError =>
  new ClientError(
    {
      data: null,
      errors: [],
      status,
      headers: new Headers()
    },
    { query: 'query SampleOperation { field }' }
  );

describe('GraphqlGateway', () => {
  let gateway: GraphqlGateway;
  let tokenStorage: TokenStorageStub;
  let requestSpy: jasmine.Spy;

  beforeEach(() => {
    tokenStorage = new TokenStorageStub();
    gateway = new GraphqlGateway(tokenStorage as unknown as TokenStorageService);
    requestSpy = spyOn(GraphQLClient.prototype, 'request');
  });

  afterEach(() => {
    requestSpy.calls.reset();
  });

  it('should resolve a successful request on first attempt', async () => {
    const payload = { message: 'ok' };
    requestSpy.and.resolveTo(payload);

    await expectAsync(
      gateway.request<typeof payload, Record<string, unknown>>(sampleDocument, { foo: 'bar' })
    ).toBeResolvedTo(payload);

    expect(requestSpy.calls.count()).toBe(1);
    expect(requestSpy.calls.argsFor(0)[1]).toEqual({ foo: 'bar' });
  });

  it('should retry on server errors and eventually resolve', async () => {
    const payload = { data: 'success' };
    let attempt = 0;
    requestSpy.and.callFake(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw createClientError(500);
      }
      return payload;
    });

    await expectAsync(
      gateway.request<typeof payload, Record<string, unknown>>(sampleDocument, {})
    ).toBeResolvedTo(payload);

    expect(requestSpy.calls.count()).toBe(2);
  });

  it('should not retry for client-side GraphQL errors', async () => {
    const error = createClientError(400);
    requestSpy.and.rejectWith(error);

    await expectAsync(
      gateway.request(sampleDocument, undefined)
    ).toBeRejectedWith(error);

    expect(requestSpy.calls.count()).toBe(1);
  });

  it('should retry for non-GraphQL errors until max attempts', async () => {
    const genericError = new Error('network glitch');
    let attempt = 0;
    requestSpy.and.callFake(async () => {
      attempt += 1;
      if (attempt < 3) {
        throw genericError;
      }
      return { ok: true };
    });

    await expectAsync(
      gateway.request(sampleDocument, undefined)
    ).toBeResolvedTo({ ok: true });

    expect(requestSpy.calls.count()).toBe(3);
  });

  it('should propagate final error when retries exhausted', async () => {
    const failure = new Error('persistent failure');
    requestSpy.and.rejectWith(failure);

    await expectAsync(
      gateway.request(sampleDocument, undefined)
    ).toBeRejectedWith(failure);

    expect(requestSpy.calls.count()).toBe(3);
  });
});
