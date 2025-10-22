export const MCP_TOOL_DEFINITIONS = {
  tools: [
    {
      name: 'execute_graphql_query',
      description: '执行GraphQL查询，支持queries、mutations和subscriptions，自动处理API认证',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'GraphQL查询语句（支持query、mutation、subscription）',
          },
          variables: {
            type: 'object',
            description: 'GraphQL查询变量，可选',
          },
          operationName: {
            type: 'string',
            description: '操作名称，可选',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ],
} as const;
