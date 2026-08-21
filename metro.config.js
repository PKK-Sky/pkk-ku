const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support for cjs modules
config.resolver.sourceExts.push('cjs');

module.exports = config;
