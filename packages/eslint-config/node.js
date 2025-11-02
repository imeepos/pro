const { createTypeScriptConfig } = require('./factory');

module.exports = createTypeScriptConfig({
  projectFiles: ['tsconfig.node.json', 'tsconfig.json'],
  sourceType: 'module',
});
