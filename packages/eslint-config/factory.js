const fs = require('node:fs');
const path = require('node:path');
const pluginTs = require('@typescript-eslint/eslint-plugin');
const parserTs = require('@typescript-eslint/parser');

const DEFAULT_PROJECT_CANDIDATES = [
  'tsconfig.eslint.json',
  'tsconfig.app.json',
  'tsconfig.lib.json',
  'tsconfig.spec.json',
  'tsconfig.worker.json',
  'tsconfig.server.json',
  'tsconfig.json',
  'tsconfig.base.json',
];

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/.turbo/**',
  '**/.angular/**',
];

const DEFAULT_RULES = {
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/consistent-type-imports': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-base-to-string': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/no-misused-promises': 'off',
  '@typescript-eslint/no-unnecessary-type-assertion': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-enum-comparison': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/prefer-promise-reject-errors': 'off',
  '@typescript-eslint/unbound-method': 'off',
  'no-console': 'off',
};

const unique = (values) => [...new Set(values)];

const filterExistingFiles = (root, candidates) =>
  candidates
    .map((candidate) => path.resolve(root, candidate))
    .filter((absolutePath) => fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile());

const applyParser = (configs, parserOptions) =>
  configs.map((config) => {
    if (!config.languageOptions) {
      return config;
    }

    const previousOptions = config.languageOptions.parserOptions ?? {};

    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parser: parserTs,
        parserOptions: {
          ...previousOptions,
          ...parserOptions,
        },
      },
    };
  });

function createTypeScriptConfig(options = {}) {
  const root = options.tsconfigRootDir ?? process.cwd();
  const sourceType = options.sourceType ?? 'module';

  const projectCandidates = unique([
    ...DEFAULT_PROJECT_CANDIDATES,
    ...(options.projectFiles ?? []),
  ]);

  const existingProjects =
    options.project === false ? [] : filterExistingFiles(root, projectCandidates);

  const parserOptions = {
    ecmaVersion: options.ecmaVersion ?? 'latest',
    sourceType,
    tsconfigRootDir: root,
  };

  if (existingProjects.length > 0) {
    parserOptions.project = existingProjects;
  }

  const recommended = applyParser(pluginTs.configs['flat/recommended'], parserOptions);
  const typeAware =
    parserOptions.project && options.typeAware !== false
      ? applyParser(pluginTs.configs['flat/recommended-type-checked'], parserOptions)
      : [];

  const ignores = unique([
    ...DEFAULT_IGNORES,
    ...(options.ignores ?? []),
  ]);

  const rules = {
    ...DEFAULT_RULES,
    ...(options.rules ?? {}),
  };

  return [
    {
      name: 'pro/ignores',
      ignores,
    },
    ...recommended,
    ...typeAware,
    {
      name: 'pro/custom-rules',
      languageOptions: {
        parser: parserTs,
        parserOptions,
      },
      plugins: {
        '@typescript-eslint': pluginTs,
      },
      rules,
    },
  ];
}

module.exports = {
  createTypeScriptConfig,
};
