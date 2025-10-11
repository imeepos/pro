import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  outDir: 'dist',
  external: ['@pro/types', 'jwt-decode']
})