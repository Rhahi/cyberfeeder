const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  input: './build/src/background/main.js',
  output: {
    file: './app/js/background.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs()],
};
