const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  input: './build/src/jnet/main.js',
  output: {
    file: './app/js/jnet.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs()],
};
