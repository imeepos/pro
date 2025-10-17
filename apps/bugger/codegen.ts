import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/apps/api/schema.graphql',
  documents: [
    'src/app/graphql/operations.ts',
    'src/app/**/*.graphql',
    'src/app/**/*.gql'
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