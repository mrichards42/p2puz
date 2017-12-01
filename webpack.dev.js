const merge = require('webpack-merge')

module.exports = merge(require('./webpack.common'), {
  devtool: 'eval',
  devServer: {
    contentBase: '.',
  },
})
