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
  external: [
    'redis',
    'ioredis',
    '@redis/client',
    '@redis/graph',
    '@redis/json',
    '@redis/search',
    '@redis/time-series',
    'cluster',
    'crypto',
    'events',
    'fs',
    'net',
    'os',
    'path',
    'stream',
    'tls',
    'url',
    'util'
  ]
})