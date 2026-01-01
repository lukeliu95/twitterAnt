# Money Signal - 功能说明文档

**版本**: 1.0.0
**日期**: 2026-01-01
**作者**: Money Signal Team
**状态**: 已发布

---

## 目录

1. [产品概述](#1-产品概述)
2. [核心功能](#2-核心功能)
3. [用户界面设计](#3-用户界面设计)
4. [技术架构](#4-技术架构)
5. [数据模型](#5-数据模型)
6. [API 接口](#6-api-接口)
7. [扩展架构](#7-扩展架构)
8. [本地优先策略](#8-本地优先策略)
9. [部署说明](#9-部署说明)
10. [开发指南](#10-开发指南)

---

## 1. 产品概述

### 1.1 产品定位

Money Signal 是一款基于 Chrome 浏览器的扩展程序，通过 AI 分析 Twitter 推文，自动识别和提取有价值的赚钱机会信号，帮助用户发现市场需求、收入验证、技能需求和趋势机会。

### 1.2 设计理念

#### Alan Cooper 交互设计原则

- **简化交互**：单一书签图标操作，减少用户认知负荷
- **目标导向**：用户可以快速筛选和保存感兴趣的信号
- **即时反馈**：视觉上清晰显示信号状态（已保存/未保存）

#### Local First 架构

- 用户数据存储在本地 SQLite 数据库
- 无需登录，完全匿名使用
- 数据所有权归用户所有

### 1.3 目标用户

- 独立开发者寻找市场机会
- 自由职业者发现技能需求
- 创业者验证商业想法
- 投资者了解市场趋势

---

## 2. 核心功能

### 2.1 信号类型

Money Signal 自动识别四种类型的赚钱机会：

| 信号类型 | 图标 | 描述 | 评分维度 |
|---------|------|------|---------|
| **需求缺口** (Demand) | 💡 | 用户愿意付费的明确需求 | 市场规模、紧迫性 |
| **收入验证** (Revenue) | 💰 | 真实的收入分享证明 | 收入金额、增长趋势 |
| **技能需求** (Skill) | 🛠️ | 市场对特定技能的需求 | 技能稀缺性、报酬水平 |
| **趋势机会** (Trend) | 📈 | 新兴趋势和早期机会 | 趋势强度、时间窗口 |

### 2.2 信号评分系统

每个信号根据以下因素计算 1-5 分的评分：

```
基础分 = 3.0

作者影响力：
- 认证用户 +0.5
- 粉丝数 > 50K +0.5
- 粉丝数 > 100K +0.5

互动数据：
- 互动率 > 1% +0.5
- 转发 > 50 +0.3
- 点赞 > 100 +0.2

内容质量：
- 文本长度 100-500字符 +0.3
- 包含链接 +0.2
- 包含媒体 +0.1

类型加成：
- 需求缺口 +0.5
- 收入验证 +0.8
- 技能需求 +0.3
- 趋势机会 +0.4

最终评分 = MIN(5, MAX(1, ROUND(基础分 × 10) / 10))
```

### 2.3 核心交互流程

#### 2.3.1 信号发现

1. 用户浏览 Twitter
2. Content Script 实时分析推文内容
3. 符合条件的推文自动发送到后端
4. 后端 AI Agent 深度分析推文
5. 生成的信号存储到本地数据库

#### 2.3.2 信号管理

**简化交互模型**：

```
┌─────────────────────────────────────┐
│  信号卡片                           │
│  ┌───────────────────────────────┐  │
│  │ 💡 需求缺口  ★★★★☆  🔖      │  │
│  │                                │  │
│  │ 检测到明确的市场需求...         │  │
│  │                                │  │
│  │ [展开详情 ▼]                   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           ↓ 点击书签
┌─────────────────────────────────────┐
│  信号卡片（已保存）                 │
│  ┌───────────────────────────────┐  │
│  │ 💡 需求缺口  ★★★★☆  🔥      │  │
│  │                                │  │
│  │ 检测到明确的市场需求...         │  │
│  │                                │  │
│  │ [展开详情 ▼]                   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**交互说明**：
- 🔖 = 未保存，点击后保存
- 🔥 = 已保存，点击后取消保存
- 粉色边框 = 已保存状态视觉反馈
- 信号永久保留在列表中，不会因保存而消失

#### 2.3.3 筛选功能

- **视图切换**：全部 / 已保存
- **类型筛选**：全部 / 需求 / 收入 / 技能 / 趋势
- **组合筛选**：已保存 + 特定类型

---

## 3. 用户界面设计

### 3.1 Side Panel 布局

```
┌─────────────────────────────────┐
│  Money Signal                   │
├─────────────────────────────────┤
│  [全部 12] [已保存 3]           │
│                                 │
│  [全部] [需求] [收入] [技能] [趋势]│
│                                 │
│  ┌───────────────────────────┐  │
│  │ 💡 需求缺口  ★★★★☆  🔖  │  │
│  │                            │  │
│  │ 检测到明确的市场需求...     │  │
│  │                            │  │
│  │ 2小时前                    │  │
│  │ [展开详情 ▼]               │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 💰 收入验证  ★★★★★  🔥  │  │
│  │                            │  │
│  │ 真实的收入分享...          │  │
│  │                            │  │
│  │ 5小时前                    │  │
│  │ [展开详情 ▼]               │  │
│  └───────────────────────────┘  │
│                                 │
│  🔄 刷新                        │
└─────────────────────────────────┘
```

### 3.2 信号详情展开

```
┌───────────────────────────────────┐
│ 💡 需求缺口  ★★★★☆  🔥          │
│                                   │
│ 检测到明确的市场需求...            │
│                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                   │
│ 📋 原因：                          │
│ 推文表达了具体的痛点或未满足的需求 │
│                                   │
│ ✅ 行动计划：                      │
│ • 验证需求规模和目标受众           │
│ • 调研现有解决方案的不足           │
│ • 设计最小可行产品 (MVP)           │
│ • 快速推向市场获取反馈             │
│                                   │
│ 🎯 匹配技能：                      │
│ 产品管理, 用户调研, MVP 开发       │
│                                   │
│ ⚔️ 竞争程度：                      │
│ 需求明确，执行是关键               │
│                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                   │
│ 📝 原文                           │
│ [翻译]                            │
│                                   │
│ Looking for a tool that can...    │
│                                   │
│ [查看推文 →]                       │
│                                   │
│ [收起详情 ▲]                       │
└───────────────────────────────────┘
```

### 3.3 色彩系统

| 用途 | 颜色 | Hex Code |
|-----|------|----------|
| 需求缺口 | 蓝色 | `#1fa1f1` |
| 收入验证 | 绿色 | `#17bf63` |
| 技能需求 | 金色 | `#ffd700` |
| 趋势机会 | 粉红 | `#e0245e` |
| 已保存边框 | 亮粉红 | `#f91880` |
| 评分星级 | 金色 | `#ffd700` |
| 背景 | 黑色 | `#000000` |
| 卡片背景 | 深灰 | `#16181c` |
| 边框 | 中灰 | `#2f3336` |
| 主文本 | 白色 | `#e7e9ea` |
| 次要文本 | 灰色 | `#71767b` |

---

## 4. 技术架构

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ Twitter.com  │        │ Side Panel   │                  │
│  │              │◄───────│              │                  │
│  │ Content      │        │ Signal UI    │                  │
│  │ Script       │        │              │                  │
│  └──────┬───────┘        └──────┬───────┘                  │
│         │                        │                           │
│         │ chrome.runtime.sendMessage                        │
│         ▼                        ▼                           │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Service Worker (Extension)               │       │
│  │  • TweetQueueManager                             │       │
│  │  • BackendAPI (HTTP Client)                      │       │
│  │  • Message Router                                │       │
│  └────────────────────┬─────────────────────────────┘       │
│                       │                                       │
│                       │ HTTP REST API                        │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │           Backend Server (Hono + Node.js)          │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  API Routes                                  │  │     │
│  │  │  • /api/v1/tweets  - 推文提交               │  │     │
│  │  │  • /api/v1/signals - 信号查询/管理           │  │     │
│  │  │  • /api/v1/feedback - 用户反馈              │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  AI Agent System                            │  │     │
│  │  │  • OrchestratorAgent - 协调器               │  │     │
│  │  │  • DemandGapAgent - 需求分析                │  │     │
│  │  │  • RevenueProofAgent - 收入验证             │  │     │
│  │  │  • SkillMatchAgent - 技能匹配               │  │     │
│  │  │  • TrendAgent - 趋势分析                    │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  Database Layer (sql.js + SQLite)           │  │     │
│  │  │  • SignalDAO - CRUD 操作                    │  │     │
│  │  │  • Local Storage - money-signal.db          │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  本地文件系统                                                 │
│  /backend/data/money-signal.db                                │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 技术栈

#### 扩展端 (Extension)

| 技术 | 版本 | 用途 |
|-----|------|-----|
| TypeScript | 5.x | 类型安全的开发 |
| Vite | 5.x | 构建工具 |
| Chrome Extension API | Manifest V3 | 浏览器扩展接口 |
| React (隐式) | - | UI 渲染 |

#### 后端服务 (Backend)

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Node.js | 23.x | 运行时环境 |
| TypeScript | 5.x | 类型安全的开发 |
| Hono | 4.x | Web 框架 |
| sql.js | 1.13 | 纯 JavaScript SQLite |
| Anthropic Claude API | - | AI 分析 |

### 4.3 目录结构

```
twitterAnt/
├── backend/                    # 后端服务
│   ├── data/                   # 本地数据库
│   │   └── money-signal.db    # SQLite 数据库文件
│   ├── src/
│   │   ├── agents/            # AI Agent 系统
│   │   │   ├── base-agent.ts
│   │   │   ├── orchestrator-agent.ts
│   │   │   ├── demand-gap-agent.ts
│   │   │   ├── revenue-proof-agent.ts
│   │   │   ├── skill-match-agent.ts
│   │   │   └── trend-agent.ts
│   │   ├── config/            # 配置文件
│   │   │   └── ai.ts
│   │   ├── database/          # 数据库层
│   │   │   ├── schema.ts      # 数据库初始化
│   │   │   └── signal-dao.ts  # DAO 操作
│   │   ├── routes/            # API 路由
│   │   │   ├── tweets.ts
│   │   │   ├── signals.ts
│   │   │   └── feedback.ts
│   │   ├── types/             # TypeScript 类型
│   │   │   └── index.ts
│   │   ├── utils/             # 工具函数
│   │   │   └── logger.ts
│   │   └── index.ts           # 服务入口
│   ├── package.json
│   └── tsconfig.json
│
├── extension/                 # 浏览器扩展
│   ├── src/
│   │   ├── background/        # Service Worker
│   │   │   ├── service-worker.ts
│   │   │   ├── backend-api.ts
│   │   │   └── tweet-queue.ts
│   │   ├── content/           # Content Script
│   │   │   ├── twitter-extractor.ts
│   │   │   └── injector.ts
│   │   ├── sidepanel/         # Side Panel UI
│   │   │   └── main.ts
│   │   ├── shared/            # 共享代码
│   │   │   ├── constants/
│   │   │   │   └── config.ts
│   │   │   ├── types/
│   │   │   │   └── tweet.ts
│   │   │   └── utils/
│   │   │       └── logger.ts
│   │   └── manifest.json      # 扩展清单
│   ├── package.json
│   └── tsconfig.json
│
├── Docs/                      # 文档
│   ├── 01-project-structure.md
│   ├── 02-technical-implementation.md
│   ├── 03-api-design.md
│   ├── 04-database-design.md
│   ├── 05-development-roadmap.md
│   ├── 06-feature-specification-20260101.md  # 本文档
│   └── money-signal-product-plan.md
│
└── .gitignore
```

---

## 5. 数据模型

### 5.1 核心数据类型

#### TweetData (推文数据)

```typescript
interface TweetData {
  id: string;                  // 推文唯一标识
  text: string;                // 推文文本内容
  author: {
    username: string;          // 用户名 (@xxx)
    displayName: string;       // 显示名称
    verified: boolean;         // 认证状态
    followerCount: number;     // 粉丝数
  };
  engagement: {
    replies: number;           // 回复数
    retweets: number;          // 转发数
    likes: number;             // 点赞数
    views: number;             // 浏览数
  };
  timestamp: string;           // ISO 8601 时间戳
  url: string;                 // 推文 URL
  type: 'original' | 'retweet' | 'reply' | 'quote';
  media?: string[];            // 媒体 URL 数组
  links?: string[];            // 链接 URL 数组
}
```

#### Signal (信号数据)

```typescript
interface Signal {
  id: string;                  // 信号唯一标识
  tweetId: string;             // 关联的推文 ID
  type: SignalType;            // 信号类型
  score: number;               // 评分 (1-5)

  // 分析结果
  summary: string;             // 一句话摘要
  description: string;         // 详细描述
  reason: string;              // 原因说明
  actionPlan: string[];        // 行动建议列表
  matchedSkills: string[];     // 匹配的技能
  competition: string;         // 竞争程度分析

  // 原始数据
  originalTweet: TweetData;    // 原始推文

  // 时间戳
  createdAt: Date;             // 创建时间
  expiresAt: Date;             // 过期时间 (7天)

  // 用户操作
  saved?: boolean;             // 是否已保存
}
```

#### SignalType (信号类型)

```typescript
type SignalType = 'demand' | 'revenue' | 'skill' | 'trend';
```

### 5.2 数据库 Schema

```sql
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,

  -- 信号分类
  type TEXT NOT NULL CHECK(type IN ('demand', 'revenue', 'skill', 'trend')),
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),

  -- 分析内容
  summary TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  action_plan TEXT,             -- JSON 数组
  matched_skills TEXT,          -- JSON 数组
  competition TEXT,

  -- 原始数据
  original_tweet TEXT NOT NULL, -- JSON 对象

  -- 时间戳
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,

  -- 用户操作
  is_saved INTEGER DEFAULT 0 CHECK(is_saved IN (0, 1)),
  saved_at TEXT
);

-- 索引
CREATE INDEX idx_signals_type ON signals(type);
CREATE INDEX idx_signals_score ON signals(score DESC);
CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_signals_saved ON signals(is_saved, saved_at DESC);
```

---

## 6. API 接口

### 6.1 推文相关

#### POST /api/v1/tweets

提交单条推文进行分析。

**请求体**:
```json
{
  "id": "1234567890",
  "text": "Looking for a tool that can automate...",
  "author": {
    "username": "johndoe",
    "displayName": "John Doe",
    "verified": true,
    "followerCount": 50000
  },
  "engagement": {
    "replies": 10,
    "retweets": 25,
    "likes": 150,
    "views": 5000
  },
  "timestamp": "2026-01-01T12:00:00Z",
  "url": "https://twitter.com/johndoe/status/1234567890",
  "type": "original"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tweetId": "1234567890",
    "status": "queued"
  }
}
```

#### POST /api/v1/tweets/batch

批量提交推文进行分析（最多 50 条）。

**请求体**:
```json
{
  "tweets": [
    { /* TweetData */ },
    { /* TweetData */ }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "accepted": 2,
    "rejected": 0,
    "generated": 2,
    "analysisMethod": "ai",
    "jobId": "job_1234567890"
  }
}
```

### 6.2 信号相关

#### GET /api/v1/signals

获取信号列表。

**查询参数**:
- `type` (可选): 信号类型 (`demand` | `revenue` | `skill` | `trend`)
- `savedOnly` (可选): 只返回已保存的信号 (`true` | `false`)
- `limit` (可选): 返回数量限制，默认 50

**示例**:
```
GET /api/v1/signals?type=demand&savedOnly=true&limit=20
```

**响应**:
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "sig_1234567890_abc",
        "tweetId": "1234567890",
        "type": "demand",
        "score": 4,
        "summary": "💡 需求缺口: 检测到明确的市场需求...",
        "description": "检测到明确的市场需求，用户愿意为此付费...",
        "reason": "推文表达了具体的痛点或未满足的需求",
        "actionPlan": [
          "验证需求规模和目标受众",
          "调研现有解决方案的不足",
          "设计最小可行产品 (MVP)",
          "快速推向市场获取反馈"
        ],
        "matchedSkills": ["产品管理", "用户调研", "MVP 开发"],
        "competition": "需求明确，执行是关键",
        "originalTweet": { /* TweetData */ },
        "createdAt": "2026-01-01T12:00:00Z",
        "expiresAt": "2026-01-08T12:00:00Z",
        "saved": true
      }
    ],
    "total": 1
  }
}
```

#### GET /api/v1/signals/stats

获取信号统计信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "saved": 15,
    "byType": {
      "demand": 35,
      "revenue": 25,
      "skill": 20,
      "trend": 20
    }
  }
}
```

#### GET /api/v1/signals/:id

获取单个信号详情。

**响应**:
```json
{
  "success": true,
  "data": { /* Signal */ }
}
```

#### PATCH /api/v1/signals/:id/bookmark

切换信号的书签状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "sig_1234567890_abc",
    "saved": true,
    "signal": { /* Signal */ }
  }
}
```

#### DELETE /api/v1/signals/:id

删除信号。

**响应**:
```json
{
  "success": true,
  "data": {
    "deleted": "sig_1234567890_abc"
  }
}
```

#### POST /api/v1/signals/cleanup

清理过期信号。

**响应**:
```json
{
  "success": true,
  "data": {
    "deleted": 5
  }
}
```

---

## 7. 扩展架构

### 7.1 Chrome Extension 组件

```
┌───────────────────────────────────────────────────────┐
│                   Chrome Extension                     │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Content      │  │ Service      │  │ Side Panel  │  │
│  │ Script       │  │ Worker       │  │             │  │
│  │              │  │              │  │             │  │
│  │ • 提取推文    │  │ • 消息路由   │  │ • 信号展示  │  │
│  │ • 发送到后端  │  │ • 队列管理   │  │ • 用户交互  │  │
│  │              │  │ • API 调用   │  │ • 自动刷新  │  │
│  └──────────────┘  └──────────────┘  └────────────┘  │
│         │                   ▲               │         │
│         │                   │               │         │
│         └───────────────────┼───────────────┘         │
│                             │                         │
│                   chrome.runtime.sendMessage          │
└───────────────────────────────────────────────────────┘
```

### 7.2 消息类型

#### Content Script → Service Worker

```typescript
// 发送新推文
{
  type: 'NEW_TWEET',
  data: TweetData
}
```

#### Side Panel → Service Worker

```typescript
// 获取信号列表
{
  type: 'GET_SIGNALS',
  data?: {
    savedOnly?: boolean;
    type?: string;
  }
}

// 切换书签
{
  type: 'TOGGLE_BOOKMARK',
  data: {
    signalId: string;
  }
}

// 删除信号
{
  type: 'DELETE_SIGNAL',
  data: {
    signalId: string;
  }
}
```

#### Service Worker → Side Panel

```typescript
// 信号更新通知
{
  type: 'SIGNALS_UPDATED'
}
```

### 7.3 Service Worker 架构

```typescript
// 消息路由
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'NEW_TWEET':
      handleNewTweet(message.data);
      break;

    case 'GET_SIGNALS':
      handleGetSignals(message.data)
        .then(signals => sendResponse({ signals }))
        .catch(error => sendResponse({ error }));
      return true;

    case 'TOGGLE_BOOKMARK':
      handleToggleBookmark(message.data)
        .then(saved => sendResponse({ success: true, saved }))
        .catch(error => sendResponse({ error }));
      return true;

    case 'DELETE_SIGNAL':
      handleDeleteSignal(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error }));
      return true;
  }
});
```

### 7.4 推文队列管理

```typescript
class TweetQueueManager {
  private queue: TweetData[] = [];
  private readonly FLUSH_INTERVAL = 5000; // 5秒
  private readonly FLUSH_THRESHOLD = 10;  // 10条

  add(tweet: TweetData): void {
    this.queue.push(tweet);

    // 达到阈值立即刷新
    if (this.queue.length >= this.FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const tweets = this.queue.splice(0);
    await backendAPI.sendTweets(tweets);
  }

  forceFlush(): void {
    this.flush();
  }
}
```

---

## 8. 本地优先策略

### 8.1 设计原则

Money Signal 采用 **Local First** 架构，强调用户对数据的完全控制：

1. **数据所有权**：所有数据存储在用户本地设备
2. **隐私保护**：无需账户系统，完全匿名使用
3. **离线可用**：核心功能不依赖网络连接
4. **数据可移植**：用户可导出和备份数据

### 8.2 数据持久化

#### 技术选型：sql.js

选择 sql.js 而非 better-sqlite3 的原因：

| 因素 | sql.js | better-sqlite3 |
|-----|--------|----------------|
| 原生编译 | ❌ 不需要 | ✅ 需要 |
| 跨平台 | ✅ 完全兼容 | ⚠️ 需编译 |
| 安装难度 | ✅ 简单 | ⚠️ 复杂 |
| 性能 | ⚠️ 稍慢 | ✅ 更快 |
| 适用场景 | 扩展/轻量应用 | 桌面应用/服务器 |

#### 数据库初始化

```typescript
// backend/src/database/schema.ts
export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // 加载或创建数据库
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables(db);
  }

  return db;
}
```

#### 自动保存

```typescript
export function saveDatabase(db: Database): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}
```

### 8.3 数据清理策略

- **自动过期**：信号 7 天后自动过期
- **定期清理**：每小时清理一次过期信号
- **手动清理**：用户可手动删除不感兴趣的信号

```typescript
// 后端定期清理
setInterval(async () => {
  const deleted = await signalDAO.deleteExpired();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} expired signals`);
  }
}, 60 * 60 * 1000); // 每小时
```

---

## 9. 部署说明

### 9.1 本地开发

#### 环境要求

- Node.js 23.x
- pnpm 9.x
- TypeScript 5.x

#### 安装依赖

```bash
# 后端
cd backend
pnpm install

# 扩展
cd extension
pnpm install
```

#### 配置环境变量

创建 `backend/.env`:

```env
# Anthropic Claude API (可选，用于 AI 分析)
ANTHROPIC_API_KEY=your_api_key_here

# 自定义 API 端点 (可选，例如使用 PPIO)
ANTHROPIC_BASE_URL=https://api.ppio.ai
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 服务端口
PORT=3001
```

#### 启动服务

```bash
# 终端 1: 启动后端
cd backend
pnpm dev

# 终端 2: 启动扩展开发服务器
cd extension
pnpm build:watch
```

#### 加载扩展

1. 打开 Chrome: `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/dist` 目录

### 9.2 生产构建

```bash
# 后端
cd backend
pnpm build

# 扩展
cd extension
pnpm build
```

### 9.3 分发扩展

#### Chrome Web Store 发布

1. 创建 ZIP 包：
```bash
cd extension/dist
zip -r money-signal.zip .
```

2. 上传到 Chrome Web Store Developer Dashboard

3. 填写商店信息：
   - 名称: Money Signal
   - 描述: Twitter 上的赚钱机会探测器
   - 分类: 生产力工具

---

## 10. 开发指南

### 10.1 代码规范

#### TypeScript 规范

- 使用严格模式: `"strict": true`
- 接口优先: 优先使用 `interface` 而非 `type`
- 显式返回类型: 所有函数必须声明返回类型
- 禁止 `any`: 使用 `unknown` 替代

#### 命名约定

| 类型 | 约定 | 示例 |
|-----|------|------|
| 接口 | PascalCase | `interface TweetData` |
| 类型 | PascalCase | `type SignalType` |
| 类 | PascalCase | `class BackendAPI` |
| 函数 | camelCase | `function getSignals()` |
| 常量 | UPPER_SNAKE_CASE | `const API_BASE_URL` |
| 私有成员 | _camelCase | `private _db: Database` |

#### 文件组织

```
// 1. 导入
import { foo } from 'bar';

// 2. 类型定义
interface MyInterface {}

// 3. 常量
const MY_CONST = 'value';

// 4. 类定义
class MyClass {
  // 公共成员
  publicField: string;

  // 私有成员
  private _privateField: string;

  // 构造函数
  constructor() {}

  // 公共方法
  publicMethod(): void {}

  // 私有方法
  private privateMethod(): void {}
}

// 5. 导出
export { MyClass };
```

### 10.2 添加新的信号类型

#### 步骤 1: 定义类型

```typescript
// backend/src/types/index.ts
export type SignalType =
  | 'demand'
  | 'revenue'
  | 'skill'
  | 'trend'
  | 'opportunity'; // 新类型
```

#### 步骤 2: 创建 Agent

```typescript
// backend/src/agents/opportunity-agent.ts
import { BaseAgent, type AnalysisResult } from './base-agent.js';

const OPPORTUNITY_SYSTEM_PROMPT = `你是一个机会识别 Agent...`;

export class OpportunityAgent extends BaseAgent {
  constructor() {
    super('Opportunity', OPPORTUNITY_SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    // 实现分析逻辑
  }
}
```

#### 步骤 3: 注册到 Orchestrator

```typescript
// backend/src/agents/orchestrator-agent.ts
import { OpportunityAgent } from './opportunity-agent.js';

export class OrchestratorAgent {
  private opportunityAgent: OpportunityAgent;

  constructor() {
    this.opportunityAgent = new OpportunityAgent();
  }

  private getAgent(type: string) {
    switch (type) {
      case 'opportunity':
        return this.opportunityAgent;
      // ...
    }
  }
}
```

#### 步骤 4: 更新 UI

```typescript
// extension/src/sidepanel/main.ts
const typeLabels = {
  demand: '需求缺口',
  revenue: '收入验证',
  skill: '技能需求',
  trend: '趋势机会',
  opportunity: '商业机会', // 新类型
};
```

### 10.3 测试指南

#### 单元测试

```bash
# 运行测试
pnpm test

# 覆盖率报告
pnpm test:coverage
```

#### 手动测试

1. **推文提取测试**:
   - 访问 Twitter.com
   - 打开开发者工具
   - 查看 Content Script 日志

2. **信号生成测试**:
   - 发送测试推文到后端
   - 检查数据库中的信号

3. **UI 交互测试**:
   - 打开 Side Panel
   - 测试书签切换
   - 测试筛选功能

### 10.4 调试技巧

#### Service Worker 调试

1. 打开 `chrome://extensions/`
2. 找到 Money Signal 扩展
3. 点击"Service Worker"
4. 在 DevTools 中调试

#### 后端调试

```bash
# 启用调试日志
DEBUG=* pnpm dev

# TypeScript 源码映射
pnpm dev --source-maps
```

---

## 附录

### A. 配置参考

#### 完整的 .env 示例

```env
# API 配置
API_BASE_URL=http://localhost:3001

# Anthropic Claude 配置
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=4000
ANTHROPIC_TEMPERATURE=0.7

# 服务配置
PORT=3001
NODE_ENV=development

# 扩展配置
EXTENSION_ID=xxxxxxxxxxxx
```

### B. 故障排除

#### 常见问题

**Q: 扩展无法加载推文**

A: 检查：
1. Content Script 是否注入
2. Twitter 页面是否完全加载
3. 查看浏览器控制台错误

**Q: 后端 API 无响应**

A: 检查：
1. 后端服务是否运行
2. 端口是否正确
3. CORS 配置是否正确

**Q: 数据库初始化失败**

A: 检查：
1. `data/` 目录是否存在
2. 文件系统权限
3. sql.js 是否正确安装

### C. 更新日志

#### v1.0.0 (2026-01-01)

- ✨ 首次发布
- ✨ 实现四种信号类型识别
- ✨ Local First 数据存储
- ✨ 简化的书签交互
- ✨ Side Panel UI
- ✨ AI Agent 系统

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-01
**维护者**: Money Signal Team
