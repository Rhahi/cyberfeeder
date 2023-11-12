import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: './src/background/main.ts',
  output: {
    file: './app/js/background.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs(), typescript({tsconfig: './tsconfig.json'})],
};
