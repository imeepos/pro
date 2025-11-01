const { createTypeScriptConfig } = require('./factory');

module.exports = createTypeScriptConfig({
  ignores: ['**/*.html', 'src/environments/**', 'src/**/graphql/generated/**'],
  projectFiles: [
    'tsconfig.app.json',
    'tsconfig.spec.json',
    'tsconfig.json',
    'tsconfig.base.json',
  ],
  typeAware: false,
});
