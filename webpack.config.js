const path = require('path');
const PACKAGE = require('./package.json');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');


// =============================================================================

const mode = (process.env.NODE_ENV || 'production');
const mini = !(process.env.DISABLE_MINI); // disable minification if env DISABLE_MINI is set

const kProjectDir = __dirname;
const kSourceDir = path.join(kProjectDir, 'src');
const kBuildDir = path.join(kProjectDir, 'build');
const kModulesDir = path.join(kProjectDir, 'node_modules');


// -----------------------------------------------------------------------------

const browsers = ['chrome', 'firefox', 'safari'];
const manifests = {
  chrome: 'v3',
  firefox: 'v2-firefox',
  safari: 'v2-safari',
};
const configs = browsers.map(browser => {
  const mver = manifests[browser];
  const buildDir = path.join(kBuildDir, browser);
  return {
    mode: mode,

    optimization: {
      minimize: mini
    },

    entry: {
      service_worker: path.join(kSourceDir, 'service_worker.js'),
      content: path.join(kSourceDir, 'content.js'),
      settings: path.join(kSourceDir, 'settings.js'),
      nflxmultisubs: path.join(kSourceDir, 'nflxmultisubs.js'),
    },
    output: {
      path: buildDir,
      filename: '[name].min.js',
    },

    plugins: [
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(kSourceDir, `manifest-${mver}.json`),
            to: "manifest.json",
            transform: (content, path) => Buffer.from(JSON.stringify({
              short_name: PACKAGE.name,
              description: PACKAGE.description,
              version: PACKAGE.version,
              ...JSON.parse(content.toString('utf-8'))
            }, null, '\t')),
          },
          {
            from: path.join(kSourceDir, '*.+(html|png|css)').replace(/\\/g, "/"),
            to: "[name][ext]",
          },
        ]
      }),
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(PACKAGE.version),
        BROWSER: JSON.stringify(browser),
      }),
    ],
  };
});


module.exports = configs;
