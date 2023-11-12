import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: './src/jnet/main.ts',
  output: {
    file: './app/js/jnet.js',
    format: 'iife',
  },
  plugins: [resolve(), commonjs(), typescript({tsconfig: './tsconfig.json'})],
};
