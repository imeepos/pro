const { createTypeScriptConfig } = require('./factory');

module.exports = createTypeScriptConfig({
  projectFiles: ['tsconfig.build.json', 'tsconfig.json', 'tsconfig.app.json'],
  ignores: ['**/*.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
});
