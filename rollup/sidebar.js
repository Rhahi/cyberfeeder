const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  input: './build/src/sidebar/main.js',
  output: {
    file: './app/js/sidebar.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs()],
};
