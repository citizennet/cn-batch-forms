const webpack = require('webpack');

module.exports = {

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

