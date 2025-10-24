import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/apps/api/schema.graphql',
  documents: [
    'src/app/core/graphql/auth.graphql',
    'src/app/core/graphql/user.graphql',
    'src/app/core/graphql/event.graphql',
    'src/app/core/graphql/event-type.graphql',
    'src/app/core/graphql/industry-type.graphql',
    'src/app/core/graphql/media-type.graphql',
    'src/app/core/graphql/tag.graphql',
    'src/app/core/graphql/screen.graphql',
    'src/app/core/graphql/weibo-search-task.graphql',
    'src/app/core/graphql/raw-data.graphql',
    'src/app/core/graphql/jd-account.graphql',
    'src/app/core/graphql/weibo-account.graphql',
    'src/app/core/graphql/weibo-data.graphql',
    'src/app/core/graphql/notifications.graphql',
    'src/app/core/graphql/dlq.graphql',
    'src/app/core/graphql/workflow.graphql'
  ],
  ignoreNoDocuments: false,
  generates: {
    'src/app/core/graphql/generated/': {
      preset: 'client',
      config: {
        strictScalars: true,
        scalars: {
          DateTime: 'string',
          JSONObject: 'Record<string, unknown>',
          JSON: 'unknown'
        },
        useTypeImports: true,
        dedupeFragments: true,
        skipTypename: false,
        documentMode: 'documentNode'
      }
    }
  }
};

export default config;
