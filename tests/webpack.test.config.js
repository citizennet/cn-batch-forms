const webpack = require('webpack');
const baseConfig = require('../webpack.config');

module.exports = Object.assign({}, baseConfig, {

  entry: '../tests/webpack.test.bootstrap.js',

  output: {
    filename: '../tests/output/test.bundle.js'

  }
});
