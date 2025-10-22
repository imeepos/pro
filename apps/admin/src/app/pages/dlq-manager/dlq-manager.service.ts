import { inject, Injectable } from '@angular/core';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { gql } from 'graphql-tag';
import { GraphqlGateway } from '../../core/graphql/graphql-gateway.service';

export interface DlqQueueView {
  name: string;
  messageCount: number;
  originalQueue: string;
}

export interface DlqMessageView {
  id: string;
  queueName: string;
  content: unknown;
  failedAt: string;
  retryCount: number;
  errorMessage?: string | null;
}

export interface DlqMessagePage {
  items: DlqMessageView[];
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface DlqQueuesQuery {
  dlqQueues: DlqQueueView[];
}

interface DlqMessagesQuery {
  dlqMessages: {
    edges: Array<{ node: DlqMessageView | null } | null>;
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

interface DlqMessagesVariables extends Record<string, unknown> {
  filter: {
    queueName: string;
    page?: number | null;
    pageSize?: number | null;
  };
}

interface RetryDlqMessagesMutation {
  retryDlqMessages: boolean;
}

interface RetryDlqMessagesVariables extends Record<string, unknown> {
  input: {
    queueName: string;
    messageIds: string[];
  };
}

interface DeleteDlqMessagesMutation {
  deleteDlqMessages: boolean;
}

interface DeleteDlqMessagesVariables extends Record<string, unknown> {
  input: {
    queueName: string;
    messageIds: string[];
  };
}

const DlqQueuesDocument: TypedDocumentNode<DlqQueuesQuery, Record<string, never>> =
  gql`
    query DlqQueues {
      dlqQueues {
        name
        messageCount
        originalQueue
      }
    }
  `;

const DlqMessagesDocument: TypedDocumentNode<
  DlqMessagesQuery,
  DlqMessagesVariables
> = gql`
  query DlqMessages($filter: DlqQueryInput) {
    dlqMessages(filter: $filter) {
      edges {
        node {
          id
          queueName
          content
          failedAt
          retryCount
          errorMessage
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

const RetryDlqMessagesDocument: TypedDocumentNode<
  RetryDlqMessagesMutation,
  RetryDlqMessagesVariables
> = gql`
  mutation RetryDlqMessages($input: RetryMessagesInput!) {
    retryDlqMessages(input: $input)
  }
`;

const DeleteDlqMessagesDocument: TypedDocumentNode<
  DeleteDlqMessagesMutation,
  DeleteDlqMessagesVariables
> = gql`
  mutation DeleteDlqMessages($input: DeleteMessagesInput!) {
    deleteDlqMessages(input: $input)
  }
`;

@Injectable({ providedIn: 'root' })
export class DlqManagerService {
  private readonly gateway = inject(GraphqlGateway);

  async fetchQueues(): Promise<DlqQueueView[]> {
    const result = await this.gateway.request<DlqQueuesQuery>(DlqQueuesDocument);
    return result.dlqQueues ?? [];
  }

  async fetchMessages(
    queueName: string,
    page: number,
    pageSize: number,
  ): Promise<DlqMessagePage> {
    const result = await this.gateway.request<DlqMessagesQuery, DlqMessagesVariables>(
      DlqMessagesDocument,
      {
        filter: {
          queueName,
          page,
          pageSize,
        },
      },
    );

    const connection = result.dlqMessages;
    const items =
      connection?.edges?.map((edge) => edge?.node).filter(Boolean) ?? [];

    return {
      items: items as DlqMessageView[],
      total: connection?.totalCount ?? 0,
      hasNextPage: connection?.pageInfo.hasNextPage ?? false,
      hasPreviousPage: connection?.pageInfo.hasPreviousPage ?? false,
    };
  }

  async retryMessages(queueName: string, messageIds: string[]): Promise<boolean> {
    const result = await this.gateway.request<
      RetryDlqMessagesMutation,
      RetryDlqMessagesVariables
    >(RetryDlqMessagesDocument, {
      input: {
        queueName,
        messageIds,
      },
    });

    return result.retryDlqMessages;
  }

  async deleteMessages(
    queueName: string,
    messageIds: string[],
  ): Promise<boolean> {
    const result = await this.gateway.request<
      DeleteDlqMessagesMutation,
      DeleteDlqMessagesVariables
    >(DeleteDlqMessagesDocument, {
      input: {
        queueName,
        messageIds,
      },
    });

    return result.deleteDlqMessages;
  }
}
