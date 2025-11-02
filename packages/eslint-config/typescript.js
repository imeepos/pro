const { createTypeScriptConfig } = require('./factory');

module.exports = createTypeScriptConfig({
  projectFiles: ['tsconfig.json', 'tsconfig.lib.json'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
});
