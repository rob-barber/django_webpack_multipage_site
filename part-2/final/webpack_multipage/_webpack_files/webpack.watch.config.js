'use strict';

// _webpack_files/webpack.watch.config.js

const merge = require('webpack-merge');
const dev = require('./webpack.config');

module.exports = (env, argv) => {
  let devConfig = dev(env, argv);

  let watchConfig = {
    devtool: 'source-map',
    watch: true
  };

  return merge(devConfig, watchConfig);
};