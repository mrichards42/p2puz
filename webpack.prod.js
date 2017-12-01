const merge = require('webpack-merge')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = merge(require('./webpack.common'), {
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true,
    }),
  ],
})
