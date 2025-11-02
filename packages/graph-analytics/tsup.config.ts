import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  external: ['@pro/entities', '@pro/types']
})
