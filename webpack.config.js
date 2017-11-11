const webpack = require('webpack');

const bundle = {

  devtool: 'source-map',

  entry: {
    'all': './src/_.cn-batch-forms.module.js',
    'all.min': './src/_.cn-batch-forms.module.js'
  },

  module: {
    rules: [
      {
        exclude: /node_modules/,
        use: [
          { loader: 'ng-annotate-loader' },
          { loader: 'babel-loader' }
        ],
        test: /\.js$/
      },
    ]
  },

  output: {
    filename: './dist/[name].js',
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.js']
  },

  node: {
    fs: 'empty'
  },
  
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      minimize: true
    })
  ]

};

const tests = {
  entry: './tests/webpack.test.bootstrap.js',

  output: {
    filename: './tests/output/test.bundle.js'
  },

  module: {
    rules: [
      {
        exclude: /node_modules/,
        use: [
          { loader: 'babel-loader' }
        ],
        test: /\.js$/
      },
    ]
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.js']
  },

  node: {
    fs: 'empty'
  },
}

module.exports = [ bundle, tests ]
