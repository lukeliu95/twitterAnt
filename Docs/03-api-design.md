# Money Signal API 设计文档

## 一、API 概览

### 1.1 基础信息

| 项目 | 说明 |
|-----|------|
| Base URL | `https://api.money-signal.com` |
| API 版本 | v1 |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | Bearer Token (可选匿名) |

### 1.2 通用响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "tweet.id",
        "message": "Tweet ID is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 成功（无返回内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |
| 503 | 服务暂不可用 |

---

## 二、推文相关 API

### 2.1 提交单条推文

**请求**

```http
POST /api/v1/tweets
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tweet": {
    "id": "1234567890",
    "text": "有没有人知道怎么把 Notion 内容转换成 Twitter thread？我愿意付费买这样的工具。",
    "author": {
      "username": "johndoe",
      "displayName": "John Doe",
      "verified": true,
      "followerCount": 12500
    },
    "engagement": {
      "replies": 23,
      "retweets": 5,
      "likes": 47,
      "views": 2500
    },
    "timestamp": "2025-01-01T10:30:00Z",
    "url": "https://twitter.com/johndoe/status/1234567890",
    "type": "original",
    "links": ["https://notion.so"],
    "media": []
  }
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "tweetId": "1234567890",
    "status": "queued",
    "jobId": "job_abc123"
  }
}
```

### 2.2 批量提交推文

**请求**

```http
POST /api/v1/tweets/batch
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tweets": [
    {
      "id": "1234567890",
      "text": "有没有人知道...",
      "author": { ... },
      "engagement": { ... },
      "timestamp": "2025-01-01T10:30:00Z",
      "type": "original"
    },
    {
      "id": "1234567891",
      "text": "我的副业这个月赚了 $500...",
      "author": { ... },
      "engagement": { ... },
      "timestamp": "2025-01-01T10:35:00Z",
      "type": "original"
    }
  ]
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "accepted": 2,
    "rejected": 0,
    "jobId": "job_batch_abc123"
  }
}
```

### 2.3 查询处理状态

**请求**

```http
GET /api/v1/tweets/status/{jobId}
Authorization: Bearer {token}
```

**响应**

```json
{
  "success": true,
  "data": {
    "jobId": "job_batch_abc123",
    "status": "processing",
    "progress": {
      "total": 2,
      "processed": 1,
      "signals": 1
    },
    "createdAt": "2025-01-01T10:30:00Z",
    "estimatedCompletion": "2025-01-01T10:31:00Z"
  }
}
```

---

## 三、信号相关 API

### 3.1 获取信号列表

**请求**

```http
GET /api/v1/signals?userId={userId}&type={type}&minScore={minScore}&limit={limit}&offset={offset}
Authorization: Bearer {token} (optional)
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 否 | 用户 ID（用于个性化推荐） |
| type | string | 否 | 信号类型：demand/revenue/skill/trend |
| minScore | number | 否 | 最低分数，默认 3 |
| limit | number | 否 | 返回数量，默认 20，最大 100 |
| offset | number | 否 | 偏移量，默认 0 |

**响应**

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "sig_abc123",
        "type": "demand",
        "score": 4,
        "summary": "有人需要 Notion 到 Twitter thread 的转换工具",
        "description": "一个有 12.5k 粉丝的用户在公开寻求能够将 Notion 内容一键转换为 Twitter thread 的工具。推文获得了 47 个赞和 23 条回复，说明这是一个真实存在的需求。",
        "reason": "你有产品开发经验和内容创作背景，这个需求与你的技能匹配度很高",
        "actionPlan": [
          "先用 Notion API + Twitter API 做一个简单 MVP",
          "在回复中展示 MVP 演示视频",
          "提供免费试用，收集用户反馈"
        ],
        "matchedSkills": ["产品开发", "内容创作"],
        "competition": "目前只有 Typefully 部分支持，且主要面向专业写手",
        "originalTweet": {
          "id": "1234567890",
          "text": "有没有人知道怎么把 Notion 内容转换成 Twitter thread？",
          "author": {
            "username": "johndoe",
            "displayName": "John Doe",
            "followerCount": 12500
          },
          "url": "https://twitter.com/johndoe/status/1234567890",
          "timestamp": "2025-01-01T10:30:00Z"
        },
        "createdAt": "2025-01-01T10:31:00Z",
        "expiresAt": "2025-01-08T10:31:00Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### 3.2 获取单个信号详情

**请求**

```http
GET /api/v1/signals/{signalId}
Authorization: Bearer {token} (optional)
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "sig_abc123",
    "type": "demand",
    "score": 4,
    "summary": "有人需要 Notion 到 Twitter thread 的转换工具",
    "description": "...",
    "reason": "...",
    "actionPlan": ["..."],
    "matchedSkills": ["产品开发", "内容创作"],
    "competition": {
      "level": "low",
      "competitors": [
        {
          "name": "Typefully",
          "description": "Twitter 写作工具，部分支持 Notion 导入",
          "url": "https://typefully.com"
        }
      ],
      "gap": "没有专门针对 Notion → Thread 的一键转换工具"
    },
    "marketAnalysis": {
      "targetMarket": "内容创作者、Notion 用户",
      "estimatedDemand": "high",
      "monetization": "订阅制 $10-29/月"
    },
    "originalTweet": { ... },
    "createdAt": "2025-01-01T10:31:00Z",
    "expiresAt": "2025-01-08T10:31:00Z"
  }
}
```

### 3.3 搜索信号

**请求**

```http
GET /api/v1/signals/search?q={query}&filters={filters}
Authorization: Bearer {token}
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| q | string | 是 | 搜索关键词 |
| filters.type | string | 否 | 信号类型过滤 |
| filters.score | number | 否 | 最低分数 |
| filters.timeRange | string | 否 | 时间范围：24h/7d/30d |

**响应**

```json
{
  "success": true,
  "data": {
    "signals": [ ... ],
    "total": 5,
    "searchTime": 23
  }
}
```

---

## 四、用户相关 API

### 4.1 获取用户画像

**请求**

```http
GET /api/v1/users/{userId}/profile
Authorization: Bearer {token}
```

**响应**

```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "skills": ["TypeScript", "产品设计", "日语"],
    "interests": ["SaaS", "内容工具", "跨境业务"],
    "experience": [
      {
        "domain": "Web 开发",
        "level": "expert"
      },
      {
        "domain": "产品设计",
        "level": "intermediate"
      }
    ],
    "preferences": {
      "signalTypes": ["demand", "revenue"],
      "languages": ["en", "zh", "ja"],
      "riskTolerance": "medium"
    },
    "stats": {
      "totalSignals": 150,
      "savedSignals": 12,
      "actedSignals": 5,
      "ignoredSignals": 30
    },
    "createdAt": "2024-12-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### 4.2 更新用户画像

**请求**

```http
PATCH /api/v1/users/{userId}/profile
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "skills": ["TypeScript", "产品设计", "日语", "Python"],
  "interests": ["SaaS", "内容工具", "跨境业务", "AI 应用"],
  "preferences": {
    "signalTypes": ["demand", "revenue", "skill"],
    "riskTolerance": "high"
  }
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### 4.3 获取用户信号历史

**请求**

```http
GET /api/v1/users/{userId}/signals?status={status}&limit={limit}
Authorization: Bearer {token}
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| status | string | 否 | 状态：saved/acted/ignored |
| limit | number | 否 | 返回数量，默认 20 |

**响应**

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "sig_abc123",
        "status": "acted",
        "actedAt": "2025-01-02T10:00:00Z",
        "note": "已私信联系，等待回复",
        "signal": { ... }
      }
    ],
    "total": 5,
    "summary": {
      "saved": 2,
      "acted": 2,
      "ignored": 1
    }
  }
}
```

---

## 五、反馈相关 API

### 5.1 提交用户反馈

**请求**

```http
POST /api/v1/feedback
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "signalId": "sig_abc123",
  "userId": "user_abc123",
  "action": "saved",
  "metadata": {
    "source": "sidepanel",
    "device": "chrome-extension"
  }
}
```

**action 类型**

| 值 | 说明 |
|-----|------|
| saved | 保存信号 |
| acted | 已行动 |
| ignored | 不感兴趣 |

**响应**

```json
{
  "success": true,
  "data": {
    "feedbackId": "feed_xyz789",
    "signalId": "sig_abc123",
    "action": "saved",
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

### 5.2 批量提交反馈

**请求**

```http
POST /api/v1/feedback/batch
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "feedbacks": [
    {
      "signalId": "sig_abc123",
      "action": "saved"
    },
    {
      "signalId": "sig_def456",
      "action": "ignored"
    }
  ]
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "accepted": 2
  }
}
```

---

## 六、Webhook API

### 6.1 创建 Webhook

**请求**

```http
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "url": "https://your-app.com/webhooks/money-signal",
  "events": ["signal.created", "signal.expired"],
  "secret": "your_webhook_secret"
}
```

**事件类型**

| 事件 | 说明 |
|-----|------|
| signal.created | 新信号创建 |
| signal.expired | 信号过期 |
| signal.updated | 信号更新 |

**响应**

```json
{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "url": "https://your-app.com/webhooks/money-signal",
    "events": ["signal.created", "signal.expired"],
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### 6.2 Webhook Payload 示例

**signal.created**

```json
{
  "event": "signal.created",
  "timestamp": "2025-01-01T10:31:00Z",
  "data": {
    "id": "sig_abc123",
    "type": "demand",
    "score": 4,
    "summary": "...",
    "originalTweet": { ... }
  }
}
```

---

## 七、错误码参考

| 错误码 | 说明 | HTTP 状态码 |
|--------|-----|-------------|
| VALIDATION_ERROR | 请求参数验证失败 | 400 |
| UNAUTHORIZED | 未认证或认证失败 | 401 |
| FORBIDDEN | 无权限访问 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| RATE_LIMIT_EXCEEDED | 请求过于频繁 | 429 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |
| SERVICE_UNAVAILABLE | 服务暂不可用 | 503 |
| TWEET_ALREADY_PROCESSED | 推文已处理 | 409 |
| SIGNAL_EXPIRED | 信号已过期 | 410 |
| INVALID_TOKEN | 无效的认证令牌 | 401 |

---

## 八、限流策略

### 8.1 速率限制

| 端点 | 限制 |
|-----|------|
| POST /tweets | 10/分钟 |
| POST /tweets/batch | 5/分钟 |
| GET /signals | 60/分钟 |
| POST /feedback | 30/分钟 |

### 8.2 限流响应头

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704110400
```

---

## 九、SDK 示例

### 9.1 JavaScript/TypeScript

```typescript
import { MoneySignalAPI } from '@money-signal/sdk';

const api = new MoneySignalAPI({
  apiKey: 'your_api_key',
  baseURL: 'https://api.money-signal.com'
});

// 提交推文
const result = await api.tweets.submit({
  id: '1234567890',
  text: '有没有人知道...',
  // ...
});

// 获取信号
const signals = await api.signals.list({
  type: 'demand',
  minScore: 3,
  limit: 20
});

// 提交反馈
await api.feedback.submit({
  signalId: 'sig_abc123',
  action: 'saved'
});
```

### 9.2 cURL

```bash
# 提交推文
curl -X POST https://api.money-signal.com/api/v1/tweets \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "tweet": {
      "id": "1234567890",
      "text": "有没有人知道...",
      ...
    }
  }'

# 获取信号
curl -X GET "https://api.money-signal.com/api/v1/signals?limit=20" \
  -H "Authorization: Bearer your_token"
```

---

*文档版本：v1.0*
*最后更新：2026年1月1日*
