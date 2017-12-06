// Shared base definitions
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const DEPENDENCIES = require('./webpack.dependencies')

// Entry points and html output
const outputs = {
  entry: {
    'bundle': './src/index.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Crossword Demo',
      filename: 'index.html',
      minify: {
        collapseWhitespace: true,
        preserveLineBreaks: true,
      },
      inject: false,
      template: require('html-webpack-template'),
      // template options
      lang: 'en',
      scripts: DEPENDENCIES.src('lodash', 'jquery', 'mousetrap', 'localforage', 'pubnub', 'simple-peer'),
      appMountId: 'puzzle',
    }),
  ],
}

// Processing and output options
const base = {
  // Output to dist directory
  output: {
    filename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  // Allow import 'SRC/$some_file'
  resolve: {
    alias: {
      SRC: path.resolve(__dirname, 'src'),
    },
  },
  // External dependencies
  externals: DEPENDENCIES.externals(),
  module: {
    rules: [
      // Run js through babel
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-env'],
            plugins: [require('babel-plugin-transform-object-rest-spread')],
            sourceMap: true,
          },
        },
      },
      // Extract scss files to a single bundle.css file
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          use: [
            {loader: 'css-loader', options: {sourceMap: true}},
            {loader: 'sass-loader', options: {sourceMap: true}},
          ],
          fallback: 'style-loader',
        }),
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin({filename: '[name].[chunkhash].css'}),
    new webpack.HashedModuleIdsPlugin(),
  ],
}

module.exports = merge(base, outputs)
