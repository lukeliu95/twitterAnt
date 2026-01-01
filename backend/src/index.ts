/**
 * Money Signal Backend API
 * 主服务器入口
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

// 导入路由
import tweetsRouter from './routes/tweets';
import signalsRouter from './routes/signals';
import feedbackRouter from './routes/feedback';

// 创建 Hono 应用
const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: '*', // 允许任何来源，包括 chrome-extension://
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 手动处理 OPTIONS 预检请求
app.options('*', (c) => {
  return c.text('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
});

// 健康检查
app.get('/', (c) => {
  return c.json({
    name: 'Money Signal API',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// API 路由
app.route('/api/v1/tweets', tweetsRouter);
app.route('/api/v1/signals', signalsRouter);
app.route('/api/v1/feedback', feedbackRouter);

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  }, 500);
});

// 启动服务器
const port = parseInt(process.env.PORT || '3001');

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Money Signal API Server                          ║
║                                                        ║
║   Version: 0.1.0                                       ║
║   Port: ${port}                                    ║
║   Env: ${process.env.NODE_ENV || 'development'}            ║
║                                                        ║
║   Waiting for requests...                              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
