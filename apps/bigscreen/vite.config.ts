import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path, { join, resolve } from 'path'
import { homedir } from 'os'
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { viteMockServe } from 'vite-plugin-mock'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const projectOutDir = resolve(__dirname, 'dist')
  const deployOutDir = join(homedir(), 'sker/nginx/html')
  const isBuild = command === 'build'

  const mirrorOutputPlugin = {
    name: 'mirror-output-to-nginx',
    closeBundle() {
      if (!existsSync(projectOutDir)) return

      if (existsSync(deployOutDir)) {
        rmSync(deployOutDir, { recursive: true, force: true })
      }

      mkdirSync(deployOutDir, { recursive: true })
      cpSync(projectOutDir, deployOutDir, { recursive: true })
    },
  }

  return {
    plugins: [
      react({
        // React优化配置
      }),
      viteMockServe({
        mockPath: 'mock',
        enable: true, // 强制启用
        watchFiles: true,
        logger: true,
      }),
      ...(isBuild ? [mirrorOutputPlugin] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      // Mock模式下完全禁用代理
    },
    build: {
      outDir: projectOutDir,
      target: 'es2020',
      sourcemap: false, // 生产环境禁用源码映射以减小体积
      cssCodeSplit: true, // 启用CSS代码分割
      assetsInlineLimit: 4096, // 小于4KB的资源内联

      // 压缩配置
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // 移除console
          drop_debugger: true, // 移除debugger
          pure_funcs: ['console.log', 'console.debug'], // 移除特定函数
          reduce_vars: true,
          reduce_funcs: true,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false, // 移除注释
        },
      },

      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
      rollupOptions: {
        output: {
          // 使用自动代码分割

          // 文件命名优化
          chunkFileNames: () => {
            return `assets/js/[name]-[hash:8].js`
          },
          entryFileNames: 'assets/js/[name]-[hash:8].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const extType = info[info.length - 1]

            // 根据资源类型分目录
            if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash:8][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash:8][extname]`
            }
            if (/\.css$/i.test(assetInfo.name || '')) {
              return `assets/css/[name]-[hash:8][extname]`
            }

            return `assets/misc/[name]-[hash:8][extname]`
          },
        },

        // Tree shaking优化
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },

    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'dayjs', 'clsx', 'tailwind-merge', 'zustand', 'lucide-react', '@pro/workflow-react'],
      exclude: ['echarts', 'web-vitals'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    // CSS优化
    css: {
      devSourcemap: false,
      modules: {
        generateScopedName: command === 'build' ? '[hash:base64:5]' : '[local]_[hash:base64:5]',
      },
    },

    // 预加载优化
    experimental: {
      renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
        // 可以配置CDN地址
        return { relative: true }
      },
    },
  }
})
