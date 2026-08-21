const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withSplashScreenFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const forceBlock = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core-splashscreen:1.0.1'
        }
    }
}
`;
      if (!config.modResults.contents.includes('core-splashscreen:1.0.1')) {
        config.modResults.contents += forceBlock;
      }
    }
    return config;
  });
};
