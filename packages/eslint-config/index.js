const { createTypeScriptConfig } = require('./factory');

const config = createTypeScriptConfig();

config.createTypeScriptConfig = createTypeScriptConfig;

module.exports = config;
