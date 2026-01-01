# Money Signal - 快速开始指南

**版本**: 1.0.0
**日期**: 2026-01-01
**目标读者**: 开发者

---

## 目录

1. [环境准备](#1-环境准备)
2. [快速启动](#2-快速启动)
3. [项目结构](#3-项目结构)
4. [核心概念](#4-核心概念)
5. [开发工作流](#5-开发工作流)
6. [常见任务](#6-常见任务)
7. [调试技巧](#7-调试技巧)

---

## 1. 环境准备

### 1.1 系统要求

- **操作系统**: macOS, Linux, Windows
- **Node.js**: 23.x 或更高版本
- **pnpm**: 9.x 或更高版本
- **Chrome**: 最新版本（用于扩展开发）

### 1.2 安装 Node.js

```bash
# 使用 nvm 安装 Node.js 23
nvm install 23
nvm use 23

# 验证安装
node --version  # 应显示 v23.x.x
```

### 1.3 安装 pnpm

```bash
npm install -g pnpm

# 验证安装
pnpm --version  # 应显示 9.x.x
```

### 1.4 克隆项目

```bash
git clone <repository-url>
cd twitterAnt
```

---

## 2. 快速启动

### 2.1 安装依赖

```bash
# 后端依赖
cd backend
pnpm install

# 扩展依赖
cd ../extension
pnpm install
```

### 2.2 配置环境变量

创建 `backend/.env` 文件：

```env
# Anthropic Claude API (可选)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 服务配置
PORT=3001
NODE_ENV=development
```

### 2.3 启动开发服务器

**终端 1 - 后端服务**:
```bash
cd backend
pnpm dev
```

预期输出：
```
[Config] .env file loaded
[API] AI Agent initialized successfully
[Database] Loaded existing database
[Server] Database initialized

╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Money Signal API Server                          ║
║                                                        ║
║   Version: 0.1.0                                       ║
║   Port: 3001                                    ║
║   Env: development            ║
║                                                        ║
║   Waiting for requests...                              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

**终端 2 - 扩展构建**:
```bash
cd extension
pnpm build:watch
```

### 2.4 加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 启用右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension/dist` 目录

### 2.5 验证安装

1. 打开 Twitter.com
2. 打开 Chrome DevTools (F12)
3. 在 Console 中查看是否有 Money Signal 日志
4. 点击扩展图标打开 Side Panel
5. 应该看到信号列表（初始为空）

---

## 3. 项目结构

### 3.1 后端结构

```
backend/
├── src/
│   ├── agents/              # AI Agent 系统
│   │   ├── base-agent.ts           # 基类
│   │   ├── orchestrator-agent.ts   # 协调器
│   │   ├── demand-gap-agent.ts     # 需求分析
│   │   ├── revenue-proof-agent.ts  # 收入验证
│   │   ├── skill-match-agent.ts    # 技能匹配
│   │   └── trend-agent.ts          # 趋势分析
│   │
│   ├── config/              # 配置
│   │   └── ai.ts                  # AI 配置
│   │
│   ├── database/            # 数据库
│   │   ├── schema.ts               # 数据库初始化
│   │   └── signal-dao.ts           # DAO 操作
│   │
│   ├── routes/              # API 路由
│   │   ├── tweets.ts               # 推文接口
│   │   ├── signals.ts              # 信号接口
│   │   └── feedback.ts             # 反馈接口
│   │
│   ├── types/               # TypeScript 类型
│   │   └── index.ts
│   │
│   ├── utils/              # 工具函数
│   │   └── logger.ts
│   │
│   └── index.ts             # 入口文件
│
├── data/                     # 本地数据库
│   └── money-signal.db
│
├── package.json
└── tsconfig.json
```

### 3.2 扩展结构

```
extension/
├── src/
│   ├── background/          # Service Worker
│   │   ├── service-worker.ts      # 消息路由
│   │   ├── backend-api.ts         # HTTP 客户端
│   │   └── tweet-queue.ts         # 队列管理
│   │
│   ├── content/            # Content Script
│   │   ├── twitter-extractor.ts   # 推文提取
│   │   └── injector.ts            # 脚本注入
│   │
│   ├── sidepanel/          # Side Panel UI
│   │   └── main.ts                 # 主逻辑
│   │
│   └── shared/             # 共享代码
│       ├── constants/
│       │   └── config.ts
│       ├── types/
│       │   └── tweet.ts
│       └── utils/
│           └── logger.ts
│
├── public/                  # 静态资源
│   └── icons/
│
├── manifest.json            # 扩展清单
├── package.json
└── tsconfig.json
```

---

## 4. 核心概念

### 4.1 信号生命周期

```
推文 → Content Script → Service Worker → Backend → AI Agent → 信号 → 数据库
```

### 4.2 消息传递

扩展组件之间通过 Chrome Runtime 消息通信：

```typescript
// 发送消息
chrome.runtime.sendMessage({
  type: 'GET_SIGNALS',
  data: { savedOnly: true }
}, (response) => {
  console.log(response.signals);
});

// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SIGNALS') {
    // 处理消息
    sendResponse({ signals: [...] });
  }
});
```

### 4.3 数据流

```
推文数据 → TweetQueue → 批量发送 → Orchestrator → 专项 Agent → Signal → SignalDAO → SQLite
```

---

## 5. 开发工作流

### 5.1 典型开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/my-feature

# 2. 启动开发服务器
# 终端 1
cd backend && pnpm dev
# 终端 2
cd extension && pnpm build:watch

# 3. 修改代码
# ... 编辑文件 ...

# 4. 构建并测试
cd extension && pnpm build

# 5. 在浏览器中重新加载扩展
# chrome://extensions/ → 点击刷新按钮

# 6. 提交代码
git add .
git commit -m "feat: my feature"
git push
```

### 5.2 TypeScript 开发

```typescript
// 定义接口
interface MyData {
  id: string;
  name: string;
}

// 使用类型
function processData(data: MyData): void {
  console.log(data.name);
}

// 导出
export { processData };
```

### 5.3 调试循环

1. **修改代码**
2. **保存文件** (扩展自动重新编译)
3. **刷新扩展** (chrome://extensions/)
4. **测试功能**
5. **查看日志** (DevTools Console)

---

## 6. 常见任务

### 6.1 添加新的 API 端点

**后端** (`backend/src/routes/signals.ts`):
```typescript
signalsRouter.get('/featured', async (c) => {
  const signals = await signalDAO.getAll({ limit: 5 });
  return c.json({ success: true, data: signals });
});
```

**扩展** (`extension/src/background/backend-api.ts`):
```typescript
async getFeaturedSignals(): Promise<Signal[]> {
  const url = `${CONFIG.API_BASE_URL}/api/v1/signals/featured`;
  const response = await fetch(url, { headers: { ... } });
  const result = await response.json();
  return result.data;
}
```

### 6.2 添加新的消息类型

**Service Worker** (`extension/src/background/service-worker.ts`):
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'MY_NEW_MESSAGE':
      handleMyNewMessage(message.data)
        .then(result => sendResponse({ result }))
        .catch(error => sendResponse({ error }));
      return true;
  }
});
```

**Side Panel** (`extension/src/sidepanel/main.ts`):
```typescript
chrome.runtime.sendMessage({
  type: 'MY_NEW_MESSAGE',
  data: { /* ... */ }
}, (response) => {
  console.log(response.result);
});
```

### 6.3 修改数据库 Schema

```typescript
// backend/src/database/schema.ts
db.run(`
  ALTER TABLE signals ADD COLUMN new_field TEXT;
`);
```

然后更新 DAO 接口：

```typescript
// backend/src/database/signal-dao.ts
async upsert(signal: Signal): Promise<void> {
  const stmt = db.prepare(`
    INSERT INTO signals (..., new_field)
    VALUES (..., ?)
  `);
  stmt.run([..., signal.newField || '']);
}
```

### 6.4 添加新的信号类型

1. **更新类型定义**:
```typescript
// backend/src/types/index.ts
export type SignalType =
  | 'demand'
  | 'revenue'
  | 'skill'
  | 'trend'
  | 'my-new-type';
```

2. **创建 Agent**:
```typescript
// backend/src/agents/my-new-type-agent.ts
export class MyNewTypeAgent extends BaseAgent {
  constructor() {
    super('MyNewType', SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    // 分析逻辑
  }
}
```

3. **注册到 Orchestrator**:
```typescript
// backend/src/agents/orchestrator-agent.ts
import { MyNewTypeAgent } from './my-new-type-agent.js';

export class OrchestratorAgent {
  private myNewTypeAgent: MyNewTypeAgent;

  constructor() {
    this.myNewTypeAgent = new MyNewTypeAgent();
  }
}
```

4. **更新 UI**:
```typescript
// extension/src/sidepanel/main.ts
const typeLabels = {
  demand: '需求缺口',
  revenue: '收入验证',
  skill: '技能需求',
  trend: '趋势机会',
  'my-new-type': '我的新类型',
};
```

---

## 7. 调试技巧

### 7.1 查看 Service Worker 日志

1. 访问 `chrome://extensions/`
2. 找到 Money Signal 扩展
3. 点击 "Service Worker" 链接
4. 在 DevTools 中查看日志

### 7.2 查看 Content Script 日志

1. 访问 Twitter.com
2. 打开 DevTools (F12)
3. 切换到 Console 标签
4. 查看以 `[MoneySignal]` 开头的日志

### 7.3 查看后端日志

后端日志直接显示在运行 `pnpm dev` 的终端中。

### 7.4 数据库调试

```bash
# 使用 sqlite3 命令行工具
cd backend/data
sqlite3 money-signal.db

# 查询信号
SELECT * FROM signals ORDER BY created_at DESC LIMIT 10;

# 查看统计
SELECT type, COUNT(*) FROM signals GROUP BY type;

# 退出
.quit
```

### 7.5 网络请求调试

**Service Worker**:
```typescript
// 在 backend-api.ts 中启用详细日志
logger.info('Sending request to:', url);
logger.info('Request body:', JSON.stringify(body));
```

**后端**:
```typescript
// 在路由中添加日志
app.use('*', logger());
```

### 7.6 常见问题排查

| 问题 | 解决方案 |
|-----|---------|
| 扩展无法加载推文 | 检查 Content Script 是否注入，查看控制台错误 |
| 后端 API 无响应 | 检查后端服务是否运行，端口是否正确 |
| 数据库初始化失败 | 检查 `data/` 目录权限，确保 sql.js 正确安装 |
| AI 分析失败 | 检查 `ANTHROPIC_API_KEY` 是否正确配置 |
| 类型错误 | 运行 `pnpm build` 检查 TypeScript 错误 |

---

## 8. 有用的命令

### 后端

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 清理构建
pnpm clean
```

### 扩展

```bash
# 安装依赖
pnpm install

# 开发模式 (监听文件变化)
pnpm build:watch

# 一次性构建
pnpm build

# 清理构建
pnpm clean
```

### Git

```bash
# 查看状态
git status

# 提交更改
git add .
git commit -m "描述"

# 推送到远程
git push
```

---

## 9. 下一步

- 阅读 [功能说明文档](./06-feature-specification-20260101.md)
- 阅读 [架构概览](./07-architecture-overview-20260101.md)
- 查看 [API 设计文档](./03-api-design.md)
- 了解 [数据库设计](./04-database-design.md)

---

## 10. 获取帮助

- **GitHub Issues**: [项目 Issues 页面]
- **文档**: 查看 `Docs/` 文件夹
- **示例代码**: 查看 `src/` 目录中的实现

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-01
