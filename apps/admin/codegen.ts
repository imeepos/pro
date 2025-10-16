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
    'src/app/**/*.ts'
  ],
  ignoreNoDocuments: false,
  generates: {
    'src/app/core/graphql/generated/': {
      preset: 'client',
      config: {
        scalars: {
          DateTime: 'string',
          JSONObject: 'Record<string, unknown>'
        }
      }
    }
  }
};

export default config;
