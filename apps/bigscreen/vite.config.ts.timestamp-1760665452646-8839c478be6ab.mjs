// vite.config.ts
import { defineConfig } from "file:///home/ubuntu/worktrees/pro/node_modules/vite/dist/node/index.js";
import react from "file:///home/ubuntu/worktrees/pro/node_modules/@vitejs/plugin-react/dist/index.js";
import path, { join } from "path";
import { homedir } from "os";
import { viteMockServe } from "file:///home/ubuntu/worktrees/pro/node_modules/vite-plugin-mock/dist/index.mjs";
var __vite_injected_original_dirname = "/home/ubuntu/worktrees/pro/apps/bigscreen";
var vite_config_default = defineConfig(({ command }) => ({
  plugins: [
    react({
      // React优化配置
    }),
    viteMockServe({
      mockPath: "mock",
      enable: true,
      // 强制启用
      watchFiles: true,
      logger: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    host: true
    // Mock模式下完全禁用代理
  },
  build: {
    outDir: join(homedir(), `sker/nginx/html`),
    target: "es2020",
    sourcemap: false,
    // 生产环境禁用源码映射以减小体积
    cssCodeSplit: true,
    // 启用CSS代码分割
    assetsInlineLimit: 4096,
    // 小于4KB的资源内联
    // 压缩配置
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // 移除console
        drop_debugger: true,
        // 移除debugger
        pure_funcs: ["console.log", "console.debug"],
        // 移除特定函数
        reduce_vars: true,
        reduce_funcs: true
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
        // 移除注释
      }
    },
    chunkSizeWarningLimit: 1e3,
    // 提高警告阈值到 1MB
    rollupOptions: {
      output: {
        // 使用自动代码分割
        // 文件命名优化
        chunkFileNames: (chunkInfo) => {
          return `assets/js/[name]-[hash:8].js`;
        },
        entryFileNames: "assets/js/[name]-[hash:8].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          const extType = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name || "")) {
            return `assets/images/[name]-[hash:8][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || "")) {
            return `assets/fonts/[name]-[hash:8][extname]`;
          }
          if (/\.css$/i.test(assetInfo.name || "")) {
            return `assets/css/[name]-[hash:8][extname]`;
          }
          return `assets/misc/[name]-[hash:8][extname]`;
        }
      },
      // Tree shaking优化
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "dayjs",
      "clsx",
      "tailwind-merge",
      "zustand",
      "lucide-react"
    ],
    exclude: [
      "echarts",
      // 大型库延迟加载
      "web-vitals"
      // 按需加载
    ],
    esbuildOptions: {
      target: "es2020"
    }
  },
  // CSS优化
  css: {
    devSourcemap: false,
    modules: {
      generateScopedName: command === "build" ? "[hash:base64:5]" : "[local]_[hash:base64:5]"
    }
  },
  // 预加载优化
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      return { relative: true };
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS91YnVudHUvd29ya3RyZWVzL3Byby9hcHBzL2JpZ3NjcmVlblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvdWJ1bnR1L3dvcmt0cmVlcy9wcm8vYXBwcy9iaWdzY3JlZW4vdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvdWJ1bnR1L3dvcmt0cmVlcy9wcm8vYXBwcy9iaWdzY3JlZW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGgsIHsgam9pbiB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnb3MnXG5pbXBvcnQgeyB2aXRlTW9ja1NlcnZlIH0gZnJvbSAndml0ZS1wbHVnaW4tbW9jaydcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+ICh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICAvLyBSZWFjdFx1NEYxOFx1NTMxNlx1OTE0RFx1N0Y2RVxuICAgIH0pLFxuICAgIHZpdGVNb2NrU2VydmUoe1xuICAgICAgbW9ja1BhdGg6ICdtb2NrJyxcbiAgICAgIGVuYWJsZTogdHJ1ZSwgLy8gXHU1RjNBXHU1MjM2XHU1NDJGXHU3NTI4XG4gICAgICB3YXRjaEZpbGVzOiB0cnVlLFxuICAgICAgbG9nZ2VyOiB0cnVlLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBob3N0OiB0cnVlLFxuICAgIC8vIE1vY2tcdTZBMjFcdTVGMEZcdTRFMEJcdTVCOENcdTUxNjhcdTc5ODFcdTc1MjhcdTRFRTNcdTc0MDZcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IGpvaW4oaG9tZWRpcigpLCBgc2tlci9uZ2lueC9odG1sYCksXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTc5ODFcdTc1MjhcdTZFOTBcdTc4MDFcdTY2MjBcdTVDMDRcdTRFRTVcdTUxQ0ZcdTVDMEZcdTRGNTNcdTc5RUZcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsIC8vIFx1NTQyRlx1NzUyOENTU1x1NEVFM1x1NzgwMVx1NTIwNlx1NTI3MlxuICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LCAvLyBcdTVDMEZcdTRFOEU0S0JcdTc2ODRcdThENDRcdTZFOTBcdTUxODVcdTgwNTRcbiAgICBcbiAgICAvLyBcdTUzOEJcdTdGMjlcdTkxNERcdTdGNkVcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSwgLy8gXHU3OUZCXHU5NjY0Y29uc29sZVxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLCAvLyBcdTc5RkJcdTk2NjRkZWJ1Z2dlclxuICAgICAgICBwdXJlX2Z1bmNzOiBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuZGVidWcnXSwgLy8gXHU3OUZCXHU5NjY0XHU3Mjc5XHU1QjlBXHU1MUZEXHU2NTcwXG4gICAgICAgIHJlZHVjZV92YXJzOiB0cnVlLFxuICAgICAgICByZWR1Y2VfZnVuY3M6IHRydWUsXG4gICAgICB9LFxuICAgICAgbWFuZ2xlOiB7XG4gICAgICAgIHNhZmFyaTEwOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGZvcm1hdDoge1xuICAgICAgICBjb21tZW50czogZmFsc2UsIC8vIFx1NzlGQlx1OTY2NFx1NkNFOFx1OTFDQVxuICAgICAgfSxcbiAgICB9LFxuICAgIFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCwgLy8gXHU2M0QwXHU5QUQ4XHU4QjY2XHU1NDRBXHU5NjA4XHU1MDNDXHU1MjMwIDFNQlxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICAvLyBcdTRGN0ZcdTc1MjhcdTgxRUFcdTUyQThcdTRFRTNcdTc4MDFcdTUyMDZcdTUyNzJcbiAgICAgICAgXG4gICAgICAgIC8vIFx1NjU4N1x1NEVGNlx1NTQ3RFx1NTQwRFx1NEYxOFx1NTMxNlxuICAgICAgICBjaHVua0ZpbGVOYW1lczogKGNodW5rSW5mbykgPT4ge1xuICAgICAgICAgIHJldHVybiBgYXNzZXRzL2pzL1tuYW1lXS1baGFzaDo4XS5qc2A7XG4gICAgICAgIH0sXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaDo4XS5qcycsXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lPy5zcGxpdCgnLicpIHx8IFtdO1xuICAgICAgICAgIGNvbnN0IGV4dFR5cGUgPSBpbmZvW2luZm8ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gXHU2ODM5XHU2MzZFXHU4RDQ0XHU2RTkwXHU3QzdCXHU1NzhCXHU1MjA2XHU3NkVFXHU1RjU1XG4gICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnxzdmd8d2VicHxhdmlmKShcXD8uKik/JC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUgfHwgJycpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9pbWFnZXMvW25hbWVdLVtoYXNoOjhdW2V4dG5hbWVdYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKShcXD8uKik/JC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUgfHwgJycpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9mb250cy9bbmFtZV0tW2hhc2g6OF1bZXh0bmFtZV1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1xcLmNzcyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lIHx8ICcnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvY3NzL1tuYW1lXS1baGFzaDo4XVtleHRuYW1lXWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBgYXNzZXRzL21pc2MvW25hbWVdLVtoYXNoOjhdW2V4dG5hbWVdYDtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIFRyZWUgc2hha2luZ1x1NEYxOFx1NTMxNlxuICAgICAgdHJlZXNoYWtlOiB7XG4gICAgICAgIG1vZHVsZVNpZGVFZmZlY3RzOiBmYWxzZSxcbiAgICAgICAgcHJvcGVydHlSZWFkU2lkZUVmZmVjdHM6IGZhbHNlLFxuICAgICAgICB0cnlDYXRjaERlb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfVxuICB9LFxuICBcbiAgLy8gXHU0RjE4XHU1MzE2XHU0RjlEXHU4RDU2XHU5ODg0XHU2Nzg0XHU1RUZBXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICdheGlvcycsXG4gICAgICAnZGF5anMnLFxuICAgICAgJ2Nsc3gnLFxuICAgICAgJ3RhaWx3aW5kLW1lcmdlJyxcbiAgICAgICd6dXN0YW5kJyxcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgIF0sXG4gICAgZXhjbHVkZTogW1xuICAgICAgJ2VjaGFydHMnLCAvLyBcdTU5MjdcdTU3OEJcdTVFOTNcdTVFRjZcdThGREZcdTUyQTBcdThGN0RcbiAgICAgICd3ZWItdml0YWxzJywgLy8gXHU2MzA5XHU5NzAwXHU1MkEwXHU4RjdEXG4gICAgXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICB9LFxuICB9LFxuICBcbiAgLy8gQ1NTXHU0RjE4XHU1MzE2XG4gIGNzczoge1xuICAgIGRldlNvdXJjZW1hcDogZmFsc2UsXG4gICAgbW9kdWxlczoge1xuICAgICAgZ2VuZXJhdGVTY29wZWROYW1lOiBjb21tYW5kID09PSAnYnVpbGQnID8gJ1toYXNoOmJhc2U2NDo1XScgOiAnW2xvY2FsXV9baGFzaDpiYXNlNjQ6NV0nLFxuICAgIH0sXG4gIH0sXG4gIFxuICAvLyBcdTk4ODRcdTUyQTBcdThGN0RcdTRGMThcdTUzMTZcbiAgZXhwZXJpbWVudGFsOiB7XG4gICAgcmVuZGVyQnVpbHRVcmwoZmlsZW5hbWU6IHN0cmluZywgeyBob3N0VHlwZSB9OiB7IGhvc3RUeXBlOiAnanMnIHwgJ2NzcycgfCAnaHRtbCcgfSkge1xuICAgICAgLy8gXHU1M0VGXHU0RUU1XHU5MTREXHU3RjZFQ0ROXHU1NzMwXHU1NzQwXG4gICAgICByZXR1cm4geyByZWxhdGl2ZTogdHJ1ZSB9O1xuICAgIH0sXG4gIH1cbn0pKVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2UyxTQUFTLG9CQUFvQjtBQUMxVSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxRQUFRLFlBQVk7QUFDM0IsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBSjlCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsUUFBUSxPQUFPO0FBQUEsRUFDNUMsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBO0FBQUEsSUFFTixDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsTUFDWixVQUFV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
