/**
 * Money Signal Backend API
 * 主服务器入口
 * Local First 架构 - 数据存储在本地 SQLite
 * v0.3 - 混合分析模式支持
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

// 导入数据库
import { getDatabase } from './database/schema.js';
import { signalDAO } from './database/signal-dao.js';
import { RawTweetDAO } from './database/raw-tweets-dao.js';

// 导入中间件
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// 导入路由
import tweetsRouter, { setRawTweetDAO } from './routes/tweets.js';
import signalsRouter from './routes/signals.js';
import feedbackRouter from './routes/feedback.js';

// 创建 Hono 应用
const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', errorHandler);
app.use('*', cors({
  origin: '*', // 允许任何来源，包括 chrome-extension://
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 手动处理 OPTIONS 预检请求
app.options('*', (c) => {
  return c.newResponse('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
});

// 健康检查
app.get('/', (c) => {
  return c.json({
    name: 'Trend Signal API',
    version: '0.3.0',
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
app.notFound(notFoundHandler);

// 启动服务器
const port = parseInt(process.env.PORT || '3001');

// 初始化数据库 (Local First)
async function startServer() {
  const db = await getDatabase();
  console.log('[Server] Database initialized');

  // 初始化 RawTweetDAO
  const rawTweetDAO = new RawTweetDAO(db);
  setRawTweetDAO(rawTweetDAO);
  console.log('[Server] RawTweetDAO initialized');

  // 定期清理过期信号和原始推文 (每小时)
  setInterval(async () => {
    const deleted = await signalDAO.deleteExpired();
    if (deleted > 0) {
      console.log(`[Server] Cleaned up ${deleted} expired signals`);
    }
    const rawDeleted = rawTweetDAO.cleanupExpired();
    if (rawDeleted > 0) {
      console.log(`[Server] Cleaned up ${rawDeleted} expired raw tweets`);
    }
  }, 60 * 60 * 1000);

  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Trend Signal API Server                          ║
║                                                        ║
║   Version: 0.3.0                                       ║
║   Port: ${port}                                    ║
║   Env: ${process.env.NODE_ENV || 'development'}            ║
║                                                        ║
║   ⚡ Hybrid Analysis Mode Enabled                      ║
║                                                        ║
║   Waiting for requests...                              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

  serve({
    fetch: app.fetch,
    port,
  });
}

startServer().catch(console.error);
