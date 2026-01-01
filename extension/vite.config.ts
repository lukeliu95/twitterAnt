import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import type { Plugin } from 'vite'

// 自定义插件：为所有请求添加 CORS 头
function corsHeaders(): Plugin {
  return {
    name: 'cors-headers',
    enforce: 'post', // 在其他插件之后执行
    configureServer(server) {
      // 包装 http.Server 来注入 CORS 头
      const httpServer = server.httpServer
      if (httpServer) {
        const originalEmit = (httpServer as any).emit.bind(httpServer)
        ;(httpServer as any).emit = function(event: string, ...args: any[]) {
          if (event === 'request') {
            const req: any = args[0]
            const res: any = args[1]

            // 添加监听器来注入 CORS 头
            res.on('finish', () => {
              if (!res.headersSent) {
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                res.setHeader('Access-Control-Allow-Headers', '*')
                res.setHeader('Access-Control-Expose-Headers', '*')
              }
            })

            // 处理 OPTIONS 预检请求
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
              res.setHeader('Access-Control-Allow-Headers', '*')
              res.setHeader('Access-Control-Max-Age', '86400')
              res.writeHead(204)
              res.end()
              return
            }
          }
          return originalEmit(event, ...args)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    corsHeaders(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    cors: true, // 启用 Vite 的 CORS
  },
})
