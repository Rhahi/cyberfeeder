import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: './src/sidebar/main.ts',
  output: {
    file: './app/js/sidebar.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs(), typescript({tsconfig: './tsconfig.json'})],
};
