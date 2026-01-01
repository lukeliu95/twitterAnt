# Money Signal 数据库设计文档

## 一、数据库概览

### 1.1 技术选型

| 组件 | 技术 | 用途 |
|-----|------|-----|
| 主数据库 | PostgreSQL (Supabase) | 用户、信号、推文数据 |
| 向量数据库 | Pinecone / Qdrant | 推文检索、相似度匹配 |
| 缓存 | Redis (Upstash) | 热点数据缓存、任务队列 |

### 1.2 数据流向

```
┌─────────────────────────────────────────────────────────────────┐
│                         数据流入                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (主数据库)                         │
│  - tweets: 原始推文数据                                           │
│  - signals: 分析后的信号                                          │
│  - users: 用户画像                                               │
│  - feedbacks: 用户反馈                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vector DB (向量数据库)                         │
│  - tweet_embeddings: 推文向量嵌入                                 │
│  - signal_embeddings: 信号向量嵌入                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Redis (缓存层)                               │
│  - user_signals:{userId}: 用户信号缓存                            │
│  - trending_signals: 热门信号缓存                                 │
│  - analysis_queue: 分析任务队列                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、PostgreSQL 数据模型

### 2.1 表结构

#### users (用户表)

```sql
CREATE TABLE users (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 认证信息
  auth_id VARCHAR(255) UNIQUE,        -- 外部认证 ID (可选)
  auth_provider VARCHAR(50),          -- 认证提供商：google/github/anonymous

  -- 用户画像
  skills JSONB DEFAULT '[]',          -- 技能标签：["TypeScript", "产品设计"]
  interests JSONB DEFAULT '[]',       -- 兴趣标签：["SaaS", "内容工具"]
  experience JSONB DEFAULT '[]',      -- 经验：[{"domain": "Web开发", "level": "expert"}]

  -- 偏好设置
  preferences JSONB DEFAULT '{
    "signalTypes": ["demand", "revenue", "skill", "trend"],
    "languages": ["en", "zh"],
    "riskTolerance": "medium"
  }',

  -- 统计数据
  stats JSONB DEFAULT '{
    "totalSignals": 0,
    "savedSignals": 0,
    "actedSignals": 0,
    "ignoredSignals": 0
  }',

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- 索引
  CONSTRAINT valid_auth_provider CHECK (auth_provider IN ('google', 'github', 'anonymous'))
);

-- 索引
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- GIN 索引用于 JSONB 查询
CREATE INDEX idx_users_skills ON users USING GIN(skills);
CREATE INDEX idx_users_interests ON users USING GIN(interests);
```

#### tweets (推文表)

```sql
CREATE TABLE tweets (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id VARCHAR(50) UNIQUE NOT NULL,  -- Twitter 推文 ID

  -- 推文内容
  text TEXT NOT NULL,
  author_username VARCHAR(255) NOT NULL,
  author_display_name VARCHAR(255),
  author_verified BOOLEAN DEFAULT FALSE,
  author_follower_count INTEGER DEFAULT 0,

  -- 互动数据
  engagement_replies INTEGER DEFAULT 0,
  engagement_retweets INTEGER DEFAULT 0,
  engagement_likes INTEGER DEFAULT 0,
  engagement_views INTEGER DEFAULT 0,

  -- 推文元信息
  tweet_url TEXT,
  tweet_type VARCHAR(20) NOT NULL,      -- original/retweet/reply/quote
  language VARCHAR(10) DEFAULT 'en',
  media JSONB DEFAULT '[]',             -- 媒体文件 URL
  links JSONB DEFAULT '[]',             -- 外部链接

  -- 时间戳
  tweet_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 处理状态
  processing_status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_type CHECK (tweet_type IN ('original', 'retweet', 'reply', 'quote')),
  CONSTRAINT valid_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- 索引
CREATE INDEX idx_tweets_tweet_id ON tweets(tweet_id);
CREATE INDEX idx_tweets_author ON tweets(author_username);
CREATE INDEX idx_tweets_created ON tweets(created_at DESC);
CREATE INDEX idx_tweets_status ON tweets(processing_status);
CREATE INDEX idx_tweets_likes ON tweets(engagement_likes DESC);

-- 全文搜索索引
CREATE INDEX idx_tweets_text_search ON tweets USING GIN(to_tsvector('english', text));
```

#### signals (信号表)

```sql
CREATE TABLE signals (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id VARCHAR(50) UNIQUE NOT NULL,  -- 关联的推文 ID
  signal_type VARCHAR(20) NOT NULL,      -- demand/revenue/skill/trend

  -- 信号评分和内容
  score INTEGER NOT NULL,                -- 1-5 分
  summary TEXT NOT NULL,                 -- 一句话摘要
  description TEXT,                      -- 详细描述
  reason TEXT,                          -- 为什么推给用户
  action_plan JSONB,                     -- 行动建议：["步骤1", "步骤2"]
  matched_skills JSONB DEFAULT '[]',     -- 匹配的技能

  -- 竞品分析
  competition JSONB,                     -- 竞品信息
  market_analysis JSONB,                 -- 市场分析

  -- 时间管理
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- 活跃状态
  is_active BOOLEAN DEFAULT TRUE,

  -- 统计
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  ignores_count INTEGER DEFAULT 0,

  -- 约束
  CONSTRAINT valid_signal_type CHECK (signal_type IN ('demand', 'revenue', 'skill', 'trend')),
  CONSTRAINT valid_score CHECK (score >= 1 AND score <= 5),
  CONSTRAINT fk_tweet FOREIGN KEY (tweet_id) REFERENCES tweets(tweet_id)
);

-- 索引
CREATE INDEX idx_signals_tweet_id ON signals(tweet_id);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_score ON signals(score DESC);
CREATE INDEX idx_signals_active ON signals(is_active, expires_at);
CREATE INDEX idx_signals_created ON signals(created_at DESC);

-- 复合索引用于常见查询
CREATE INDEX idx_signals_type_score ON signals(signal_type, score DESC, is_active);

-- 全文搜索
CREATE INDEX idx_signals_summary_search ON signals USING GIN(to_tsvector('english', summary));
CREATE INDEX idx_signals_description_search ON signals USING GIN(to_tsvector('english', description));
```

#### user_signals (用户-信号关联表)

```sql
CREATE TABLE user_signals (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联
  user_id UUID NOT NULL,
  signal_id UUID NOT NULL,

  -- 用户操作
  action VARCHAR(20) NOT NULL,          -- saved/acted/ignored
  note TEXT,                            -- 用户备注

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_signal FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE,
  CONSTRAINT valid_action CHECK (action IN ('saved', 'acted', 'ignored')),
  CONSTRAINT unique_user_signal UNIQUE (user_id, signal_id)
);

-- 索引
CREATE INDEX idx_user_signals_user ON user_signals(user_id);
CREATE INDEX idx_user_signals_signal ON user_signals(signal_id);
CREATE INDEX idx_user_signals_action ON user_signals(action);
CREATE INDEX idx_user_signals_created ON user_signals(created_at DESC);

-- 复合索引
CREATE INDEX idx_user_signals_user_action ON user_signals(user_id, action, created_at DESC);
```

#### feedbacks (反馈表)

```sql
CREATE TABLE feedbacks (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联
  user_id UUID,
  signal_id UUID NOT NULL,

  -- 反馈内容
  action VARCHAR(20) NOT NULL,          -- saved/acted/ignored
  feedback_quality INTEGER,             -- 反馈质量评分 1-5
  feedback_text TEXT,                   -- 文字反馈

  -- 元数据
  source VARCHAR(50),                   -- 来源：sidepanel/push/notification
  device_info JSONB,                    -- 设备信息
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_signal FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE,
  CONSTRAINT valid_feedback_action CHECK (action IN ('saved', 'acted', 'ignored'))
);

-- 索引
CREATE INDEX idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_signal ON feedbacks(signal_id);
CREATE INDEX idx_feedbacks_action ON feedbacks(action);
CREATE INDEX idx_feedbacks_created ON feedbacks(created_at DESC);
```

#### analysis_jobs (分析任务表)

```sql
CREATE TABLE analysis_jobs (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(255) UNIQUE NOT NULL,  -- 外部任务 ID

  -- 任务信息
  job_type VARCHAR(50) NOT NULL,        -- single/batch
  status VARCHAR(20) NOT NULL,          -- pending/processing/completed/failed

  -- 输入
  input_tweet_ids JSONB,                -- 推文 ID 列表
  input_count INTEGER DEFAULT 0,

  -- 输出
  output_signals JSONB,                 -- 生成的信号 ID
  signals_count INTEGER DEFAULT 0,

  -- 进度
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,

  -- 错误信息
  error_message TEXT,
  error_stack TEXT,

  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 约束
  CONSTRAINT valid_job_type CHECK (job_type IN ('single', 'batch')),
  CONSTRAINT valid_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- 索引
CREATE INDEX idx_analysis_jobs_job_id ON analysis_jobs(job_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created ON analysis_jobs(created_at DESC);
```

---

## 三、向量数据库设计

### 3.1 Pinecone/Qdrant 集合设计

#### tweets_collection (推文向量)

```json
{
  "id": "tweet_1234567890",
  "vector": [0.1, 0.2, ...],  // 1536 维（OpenAI embedding）
  "metadata": {
    "tweet_id": "1234567890",
    "text": "推文内容...",
    "type": "original",
    "language": "zh",
    "author_followers": 12500,
    "engagement_score": 85,
    "created_at": "2025-01-01T10:30:00Z"
  }
}
```

#### signals_collection (信号向量)

```json
{
  "id": "signal_abc123",
  "vector": [0.1, 0.2, ...],
  "metadata": {
    "signal_id": "abc123",
    "type": "demand",
    "score": 4,
    "summary": "有人需要 Notion 工具",
    "matched_skills": ["产品开发", "内容创作"],
    "created_at": "2025-01-01T10:31:00Z"
  }
}
```

### 3.2 向量检索查询

```typescript
// 相似推文检索
const similarTweets = await vectorDB.search({
  collection: 'tweets_collection',
  vector: embedding,
  topK: 10,
  filter: {
    type: { $eq: 'original' },
    language: { $in: ['zh', 'en'] },
    created_at: { $gte: '2025-01-01' }
  }
});

// 相似信号检索
const similarSignals = await vectorDB.search({
  collection: 'signals_collection',
  vector: embedding,
  topK: 5,
  filter: {
    type: { $eq: 'demand' },
    score: { $gte: 3 }
  }
});
```

---

## 四、Redis 缓存设计

### 4.1 缓存键结构

```
# 用户信号缓存
user_signals:{userId} -> TTL: 5分钟
  - 类型: List
  - 内容: [signal_id1, signal_id2, ...]

# 热门信号缓存
trending_signals -> TTL: 10分钟
  - 类型: ZSet (score = 热度分数)
  - 内容: {signal_id: score}

# 推文去重缓存
processed_tweets:{tweetId} -> TTL: 24小时
  - 类型: String
  - 内容: "1"

# 速率限制
rate_limit:{userId}:{endpoint} -> TTL: 60秒
  - 类型: String
  - 内容: "5" (请求次数)

# 用户会话
session:{userId} -> TTL: 24小时
  - 类型: Hash
  - 内容: {token, preferences, last_active}
```

### 4.2 任务队列

```
# 推文分析队列
queue:analysis:tweets
  - 类型: List
  - 内容: JSON 序列化的任务

# 优先级队列
queue:analysis:high
queue:analysis:normal
queue:analysis:low

# 通知队列
queue:notifications
  - 类型: List
  - 内容: {user_id, signal_id, type}
```

---

## 五、数据库迁移

### 5.1 初始化迁移

```sql
-- migration: 001_initial_schema.sql

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊匹配

-- 创建表 (按依赖顺序)
CREATE TABLE users (...);
CREATE TABLE tweets (...);
CREATE TABLE signals (...);
CREATE TABLE user_signals (...);
CREATE TABLE feedbacks (...);
CREATE TABLE analysis_jobs (...);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_signals_updated_at
  BEFORE UPDATE ON user_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 性能优化

```sql
-- 部分索引（只索引活跃信号）
CREATE INDEX idx_signals_active_only
  ON signals(score DESC, created_at DESC)
  WHERE is_active = TRUE AND expires_at > NOW();

-- 表达式索引（用于特殊查询）
CREATE INDEX idx_signals_expires_days
  ON signals((EXTRACT(DAY FROM (expires_at - NOW()))))
  WHERE is_active = TRUE;

-- 覆盖索引（包含常用字段）
CREATE INDEX idx_signals_covering
  ON signals(signal_type, score)
  INCLUDE (id, summary, created_at);
```

### 5.3 数据清理

```sql
-- 清理过期信号
UPDATE signals SET is_active = FALSE
WHERE expires_at < NOW();

-- 删除旧的推文（30天前且无关联信号）
DELETE FROM tweets
WHERE created_at < NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM signals WHERE signals.tweet_id = tweets.tweet_id
  );

-- 清理旧的已完成任务
DELETE FROM analysis_jobs
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '7 days';
```

---

## 六、数据备份与恢复

### 6.1 备份策略

```bash
# PostgreSQL 每日备份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --file=/backups/postgres_$(date +%Y%m%d).dump

# 保留最近 30 天的备份
find /backups -name "postgres_*.dump" -mtime +30 -delete

# 向量数据库备份（Pinecone 自动备份）
# Qdrant 需要手动快照
```

### 6.2 恢复流程

```bash
# 恢复 PostgreSQL
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean --if-exists \
  /backups/postgres_20250101.dump
```

---

## 七、监控指标

### 7.1 数据库性能指标

| 指标 | 告警阈值 |
|-----|---------|
| 连接数使用率 | > 80% |
| 查询响应时间 | > 100ms (P95) |
| 慢查询数量 | > 10/分钟 |
| 缓存命中率 | < 90% |
| 数据库磁盘使用 | > 80% |

### 7.2 业务指标

| 指标 | 说明 |
|-----|------|
| 每日推文处理量 | tweets/天 |
| 信号生成率 | signals/tweets |
| 用户活跃度 | DAU/MAU |
| 反馈率 | feedbacks/signals |

---

*文档版本：v1.0*
*最后更新：2026年1月1日*
