# Money Signal 项目结构设计

## 一、项目概览

```
money-signal/
├── extension/              # Chrome 浏览器插件
├── backend/               # 后端 API 服务
├── docs/                  # 项目文档
└── scripts/               # 部署和工具脚本
```

---

## 二、Chrome 插件目录结构

```
extension/
├── manifest.json                    # Manifest V3 配置文件
├── package.json
├── tsconfig.json
├── vite.config.ts                   # Vite 构建配置
│
├── src/
│   ├── background/                  # 后台服务
│   │   ├── service-worker.ts        # Service Worker 主入口
│   │   ├── twitter-api.ts          # Twitter API 封装
│   │   ├── backend-api.ts          # 后端 API 通信
│   │   ├── storage-manager.ts      # 本地存储管理
│   │   └── tweet-queue.ts          # 推文队列管理
│   │
│   ├── content/                     # Content Scripts
│   │   ├── twitter-extractor.ts    # 推文数据提取
│   │   ├── dom-observer.ts         # DOM 监听逻辑
│   │   ├── tweet-parser.ts         # 推文解析器
│   │   ├── pre-filter.ts           # 本地初筛
│   │   └── styles.css              # 注入页面的样式
│   │
│   ├── sidepanel/                   # 侧边栏 UI
│   │   ├── index.html
│   │   ├── App.tsx                 # React 主组件
│   │   ├── components/
│   │   │   ├── SignalCard.tsx      # 信号卡片
│   │   │   ├── SignalList.tsx      # 信号列表
│   │   │   ├── EmptyState.tsx      # 空状态
│   │   │   ├── LoadingState.tsx    # 加载状态
│   │   │   └── FilterBar.tsx       # 筛选栏
│   │   ├── hooks/
│   │   │   ├── useSignals.ts       # 信号数据 Hook
│   │   │   └── useUserFeedback.ts  # 用户反馈 Hook
│   │   ├── store/
│   │   │   └── signalStore.ts      # Zustand 状态管理
│   │   └── styles.css
│   │
│   ├── popup/                       # 插件弹窗（可选）
│   │   ├── index.html
│   │   └── main.tsx
│   │
│   ├── shared/                      # 共享代码
│   │   ├── constants/
│   │   │   ├── signal-types.ts     # 信号类型定义
│   │   │   ├── keywords.ts         # 关键词库
│   │   │   └── config.ts           # 配置常量
│   │   ├── types/
│   │   │   ├── tweet.ts            # 推文类型定义
│   │   │   ├── signal.ts           # 信号类型定义
│   │   │   └── user.ts             # 用户类型定义
│   │   ├── utils/
│   │   │   ├── logger.ts           # 日志工具
│   │   │   ├── debounce.ts         # 防抖函数
│   │   │   └── message-queue.ts    # 消息队列
│   │   └── styles/
│   │       ├── variables.css       # CSS 变量
│   │       └── reset.css           # 样式重置
│   │
│   └── assets/                      # 静态资源
│       ├── icons/
│       │   ├── icon-16.png
│       │   ├── icon-48.png
│       │   ├── icon-128.png
│       │   └── signal-icons.svg
│       └── images/
│
└── public/
    └── _locales/
        ├── en/messages.json         # 英文语言包
        └── zh_CN/messages.json      # 中文语言包
```

---

## 三、后端目录结构

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml               # 本地开发环境
│
├── src/
│   ├── index.ts                     # 服务入口
│   ├── app.ts                       # Express/Fastify 应用
│   │
│   ├── api/                         # API 路由
│   │   ├── routes/
│   │   │   ├── tweets.ts           # 推文相关路由
│   │   │   ├── signals.ts          # 信号相关路由
│   │   │   ├── users.ts            # 用户相关路由
│   │   │   └── feedback.ts         # 反馈相关路由
│   │   ├── middleware/
│   │   │   ├── auth.ts             # 认证中间件
│   │   │   ├── rate-limit.ts       # 限流中间件
│   │   │   ├── error-handler.ts    # 错误处理
│   │   │   └── validation.ts       # 请求验证
│   │   └── validators/
│   │       └── schema.ts           # Zod 验证模式
│   │
│   ├── agents/                      # Agent 系统
│   │   ├── orchestrator.ts         # 主控 Agent
│   │   ├── agents/
│   │   │   ├── demand-gap-agent.ts # 需求缺口 Agent
│   │   │   ├── revenue-proof-agent.ts # 收入验证 Agent
│   │   │   ├── skill-match-agent.ts # 技能匹配 Agent
│   │   │   └── trend-agent.ts      # 趋势分析 Agent
│   │   ├── prompts/
│   │   │   ├── demand-analysis.ts  # 需求分析 Prompt
│   │   │   ├── revenue-analysis.ts # 收入分析 Prompt
│   │   │   ├── skill-analysis.ts   # 技能分析 Prompt
│   │   │   └── trend-analysis.ts   # 趋势分析 Prompt
│   │   └── tools/
│   │       ├── search-similar.ts   # 搜索相似机会
│   │       ├── get-profile.ts      # 获取用户画像
│   │       ├── check-competition.ts # 检查竞品
│   │       └── generate-action.ts  # 生成行动建议
│   │
│   ├── services/                    # 业务逻辑
│   │   ├── claude-service.ts       # Claude API 服务
│   │   ├── tweet-service.ts        # 推文处理服务
│   │   ├── signal-service.ts       # 信号分析服务
│   │   ├── user-service.ts         # 用户服务
│   │   └── notification-service.ts # 通知服务
│   │
│   ├── models/                      # 数据模型
│   │   ├── Tweet.ts
│   │   ├── Signal.ts
│   │   ├── User.ts
│   │   └── Feedback.ts
│   │
│   ├── db/                          # 数据库
│   │   ├── client.ts               # 数据库客户端
│   │   ├── migrations/             # 数据库迁移
│   │   └── seeds/                  # 种子数据
│   │
│   ├── vector/                      # 向量数据库
│   │   ├── client.ts               # 向量 DB 客户端
│   │   └── embeddings.ts           # 嵌入生成
│   │
│   ├── cache/                       # 缓存层
│   │   ├── redis.ts                # Redis 客户端
│   │   └── cache-manager.ts        # 缓存管理
│   │
│   ├── queue/                       # 任务队列
│   │   ├── queue.ts                # 队列管理
│   │   └── jobs/
│   │       ├── analyze-tweet.ts    # 分析推文任务
│   │       └── send-notification.ts # 发送通知任务
│   │
│   ├── config/                      # 配置
│   │   ├── index.ts
│   │   ├── env.ts                  # 环境变量
│   │   └── constants.ts
│   │
│   └── utils/                       # 工具函数
│       ├── logger.ts
│       ├── error.ts
│       └── retry.ts
│
├── tests/                           # 测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── infra/                           # 基础设施
    ├── terraform/
    ├── docker/
    └── kubernetes/
```

---

## 四、关键模块说明

### 4.1 Content Script 模块

| 文件 | 职责 |
|-----|------|
| `twitter-extractor.ts` | 推文数据提取主控制器 |
| `dom-observer.ts` | DOM 变化监听 |
| `tweet-parser.ts` | 推文 HTML 解析 |
| `pre-filter.ts` | 本地关键词过滤 |

### 4.2 Background Service 模块

| 文件 | 职责 |
|-----|------|
| `service-worker.ts` | 消息路由、生命周期管理 |
| `tweet-queue.ts` | 推文队列管理（批量发送） |
| `backend-api.ts` | 后端 API 通信 |
| `storage-manager.ts` | 本地存储管理 |

### 4.3 Agent 系统模块

| Agent | 职责 |
|-------|------|
| `Orchestrator` | 调度专项 Agent、汇总结果 |
| `DemandGapAgent` | 识别需求缺口信号 |
| `RevenueProofAgent` | 识别收入验证信号 |
| `SkillMatchAgent` | 匹配用户技能 |
| `TrendAgent` | 识别趋势机会 |

### 4.4 工具函数 (Tools)

| Tool | 职责 |
|------|------|
| `search_similar_opportunities` | 向量检索历史相似机会 |
| `get_user_profile` | 获取用户技能画像 |
| `check_competition` | 检查竞品情况 |
| `generate_action_plan` | 生成具体行动建议 |

---

## 五、技术栈

### Chrome 插件

| 类别 | 技术 |
|-----|------|
| 开发语言 | TypeScript |
| 构建工具 | Vite + CRXJS |
| UI 框架 | React 18 |
| 状态管理 | Zustand |
| 样式方案 | CSS Modules |
| 通信 | Chrome Messaging API |

### 后端

| 类别 | 技术 |
|-----|------|
| 开发语言 | TypeScript |
| 运行时 | Node.js / Bun |
| 框架 | Fastify / Hono |
| Agent SDK | Claude Agent SDK |
| ORM | Prisma / Drizzle |
| 主数据库 | PostgreSQL (Supabase) |
| 向量数据库 | Pinecone / Qdrant |
| 缓存 | Redis (Upstash) |
| 任务队列 | BullMQ / Cloudflare Queues |
| 部署 | Railway / Fly.io / Cloudflare Workers |

---

## 六、数据流向

```
┌──────────────────────────────────────────────────────────────────┐
│                         Chrome Extension                          │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐      ┌─────────────┐  │
│  │ Content      │─tweet──▶│ Background   │─API─▶│ Side Panel  │  │
│  │ Script       │         │ Service      │      │             │  │
│  │              │         │ Worker       │◀─────│ UI          │  │
│  │ - 监听 DOM   │         │              │      │ - 显示信号  │  │
│  │ - 提取推文   │         │ - 队列管理   │      │ - 收集反馈  │  │
│  │ - 本地初筛   │         │ - API 通信   │      │             │  │
│  └──────────────┘         └──────────────┘      └─────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                           Backend API                             │
│                                                                   │
│  ┌─────────────┐     ┌──────────────────────────────────────┐    │
│  │ API Router  │────▶│       Orchestrator Agent            │    │
│  └─────────────┘     │      - 分发任务                      │    │
│                      │      - 汇总结果                      │    │
│                      └──────────────────────────────────────┘    │
│                                   │                              │
│                    ┌──────────────┼──────────────┐               │
│                    ▼              ▼              ▼               │
│         ┌──────────────┐ ┌─────────────┐ ┌─────────────┐         │
│         │ DemandGap    │ │RevenueProof │ │ SkillMatch  │         │
│         │ Agent        │ │ Agent       │ │ Agent       │         │
│         └──────────────┘ └─────────────┘ └─────────────┘         │
│                                                                   │
│         ┌──────────────────────────────────────────────────┐     │
│         │                    Tools                          │     │
│         │  - 向量检索  - 用户画像  - 竞品检查  - 行动生成   │     │
│         └──────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
         │ PostgreSQL   │ │ Vector DB   │ │   Redis     │
         │ 用户/信号    │ │ 推文检索    │ │  缓存/队列  │
         └──────────────┘ └─────────────┘ └─────────────┘
```

---

## 七、开发环境配置

### 7.1 前置要求

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose (本地开发)

### 7.2 本地开发

```bash
# 克隆项目
git clone https://github.com/your-repo/money-signal.git
cd money-signal

# 安装依赖
pnpm install

# 启动后端开发服务
cd backend
pnpm dev

# 启动插件开发
cd extension
pnpm dev

# 在 Chrome 中加载插件
# 1. 打开 chrome://extensions
# 2. 启用开发者模式
# 3. 加载已解压的扩展程序
# 4. 选择 extension/dist 目录
```

---

*文档版本：v1.0*
*最后更新：2026年1月1日*
