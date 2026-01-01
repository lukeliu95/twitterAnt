# Money Signal 产品开发方案

> 从 Twitter 中发现赚钱机会的浏览器插件

---

## 一、产品概述

### 1.1 产品定位

Money Signal 是一款浏览器插件，将 Twitter 从社交娱乐工具转变为**商业情报源**。它在用户浏览 Twitter 时，自动识别并提取潜在的赚钱机会，帮助用户「不错过能变现的信号」。

### 1.2 设计理念

基于 Alan Cooper 的 Goal-Directed Design 原则：

- **不给信息，给决策** — 用户不需要看到分析过程，只需要知道「该不该行动」
- **渐进式披露** — 一眼看到核心信息，需要时再深入
- **系统学习，而非用户配置** — 通过用户行为自动优化，而非让用户填表单

### 1.3 核心用户画像

**独立开发者/自由职业者**

- 有技能（设计/开发/写作/多语言），但不知道往哪使
- 每天刷 Twitter 2 小时，偶尔看到「这个我也能做」的帖子，但没记下来
- 核心焦虑：机会从眼前溜走的感觉
- 目标：在有限时间内抓住最值钱的信号

---

## 二、信号类型定义

### 2.1 需求缺口 (Demand Gap)

**检测模式：**
- 「有没有人知道怎么...」
- 「求推荐一个能...的工具」
- 「为什么没有人做...」
- 「我愿意付费买一个...」

**输出示例：**
```
📍 发现需求缺口

@xxx (12k followers)
「为什么没有一个工具能把 Notion 内容一键变成 Twitter thread？」

分析：
→ 47 赞，23 条回复都在说「确实需要」
→ 竞品检索：目前只有 Typefully 部分支持
→ 机会评分：⭐⭐⭐⭐

行动建议：
• 做一个 MVP 验证需求
• 或者直接私信提供人工服务，测试付费意愿
```

### 2.2 收入验证 (Revenue Proof)

**检测模式：**
- 「这个月靠 xxx 赚了...」
- 「我的 SaaS 刚到 $10k MRR」
- 「副业收入报告」
- 「从 0 到 xxx 的过程」

**输出示例：**
```
📍 发现已验证模式

@yyy
「用 AI 帮日本中小企业写招聘文案，客单价 5 万日元，这个月接了 8 单」

分析：
→ 这个人粉丝才 2k，说明门槛不高
→ 相关技能：日语 + AI 文案
→ 复制难度：⭐⭐（低）

行动建议：
• 分析 ta 的获客渠道
• 考虑差异化版本
```

### 2.3 技能套利 (Skill Arbitrage)

**检测模式：**
- 「找人帮我做...」
- 「有没有人会...」
- 「愿意付 $xxx 求...」

**输出示例：**
```
📍 发现技能需求

@zzz (创业者, 50k followers)
「找人帮我把英文 landing page 本地化成日文，
不是直译，要懂日本 B2B 语境，预算 $500」

分析：
→ 12 小时前发布，只有 3 人回复
→ 技能匹配度：⭐⭐⭐⭐⭐

行动建议：
• 直接私信，附上相关案例
• 这种单子可以发展成长期合作
```

### 2.4 趋势套利 (Trend Arbitrage)

**检测模式：**
- 某个话题突然爆发讨论
- 新工具/新政策刚发布，配套服务还没跟上
- 某个市场在讨论另一个市场已经解决的问题

**输出示例：**
```
📍 发现趋势机会

日本 Twitter 在热议：
「働き方改革で業務マニュアルの更新が追いつかない」
（工作方式改革导致业务手册更新跟不上）

分析：
→ 中国/美国市场已有 AI 文档更新工具
→ 日本本土化方案几乎空白
→ 相关度：⭐⭐⭐⭐⭐
```

---

## 三、交互设计

### 3.1 核心交互原则

| 原则 | 说明 |
|-----|------|
| 不要 Dashboard，要 Feed | 主动推送，不让用户去找信息 |
| 渐进式披露 | 第一眼一句话，点进去看详情，再点看行动方案 |
| 行动导向 | 每个信号必须带着「下一步做什么」 |
| 系统学习 | 观察用户点了什么、保存了什么、忽略了什么 |

### 3.2 信号卡片设计

```
┌─────────────────────────────────────┐
│ 💰 机会信号 #1                       │
│                                     │
│ [原始推文内容，可点击跳转]            │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ 📍 这是什么机会                      │
│ 一个日本创业者在找人做...             │
│                                     │
│ 🎯 为什么推给你                      │
│ 你有日语能力 + GTM 经验，匹配度 90%   │
│                                     │
│ ⚡ 建议你现在做                       │
│ 私信这个人，话术参考：...             │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ [🔖 保存]  [✓ 已行动]  [✗ 不感兴趣]  │
│                                     │
└─────────────────────────────────────┘
```

**三个按钮的作用：**
- 保存 → 进入机会库，后续追踪
- 已行动 → 系统学习用户会行动的类型
- 不感兴趣 → 系统学习需要过滤什么

### 3.3 推送策略

**被动模式：** 用户刷 Twitter 时，侧边栏实时显示当前页面的高价值信号

**主动模式：** 每天早上推送消息

```
「早上好。昨晚有 3 个值得你注意的信号。
最值钱的这条：[一句话摘要]
要看详情吗？」
```

---

## 四、技术架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Content    │  │ Background  │  │    Side Panel       │  │
│  │  Script     │  │ Service     │  │                     │  │
│  │             │  │ Worker      │  │  信号列表           │  │
│  │ 注入Twitter │◄─►│ 中央调度    │◄─►│  用户交互          │  │
│  │ 提取推文    │  │ API 通信    │  │  反馈收集          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  主控 Agent (Orchestrator)                           │    │
│  │  - 调度各个专项 Agent                                │    │
│  │  - 管理用户画像                                      │    │
│  │  - 决定推送什么给用户                                │    │
│  └─────────────────────────────────────────────────────┘    │
│         │           │           │           │                │
│         ▼           ▼           ▼           ▼                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 需求发现  │ │ 收入验证  │ │ 技能匹配  │ │ 趋势追踪  │        │
│  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层                                │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ PostgreSQL  │  │ 向量数据库   │  │   Redis    │          │
│  │ 用户/信号   │  │ 推文检索    │  │  缓存/队列  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 数据采集方案

**选择「用户授权 + 浏览器插件」方案的原因：**

| 优势 | 说明 |
|-----|------|
| 完全合规 | 用户自己的浏览器，用户主动授权 |
| 零采集成本 | 不需要 API 费用，不需要爬虫维护 |
| 实时性好 | 用户看到的推文立即可分析 |
| 包含算法推荐 | 能获取 Twitter 算法推给用户的个性化内容 |

**数据流：**

```
用户浏览 Twitter
       │
       ▼
┌──────────────────┐
│  Content Script  │ ← 注入到 Twitter 页面
│                  │
│  - 监听 DOM 变化  │
│  - 提取推文数据   │
│  - 去重 (本地缓存)│
└──────────────────┘
       │
       │ 批量发送 (每 10 条或每 30 秒)
       ▼
┌──────────────────┐
│  Background      │
│  Service Worker  │
│                  │
│  - 本地初筛      │
│  - 发送到后端    │
│  - 处理响应      │
└──────────────────┘
       │
       │ HTTPS POST
       ▼
┌──────────────────┐
│  Backend API     │
│                  │
│  - Agent 分析    │
│  - 返回信号评分  │
└──────────────────┘
```

### 4.3 为什么用 Claude Agent SDK

| 需求 | Claude Agent SDK 的优势 |
|-----|------------------------|
| 多个专项分析任务 | 原生支持多 Agent 协作 |
| 需要复杂推理 | Claude 推理能力强 |
| 生成行动建议 | 文本生成是强项 |
| 工具调用 | Tool Use 支持完善 |
| 快速原型 | SDK 开发效率高 |

---

## 五、浏览器插件技术实现

### 5.1 文件结构

```
money-signal-extension/
│
├── manifest.json            # 插件配置
│
├── background/
│   └── service-worker.js    # 后台服务
│
├── content/
│   ├── twitter-extractor.js # 推文提取逻辑
│   └── styles.css           # 注入页面的样式
│
├── sidepanel/
│   ├── index.html           # 侧边栏 UI
│   ├── app.js               # 侧边栏逻辑
│   └── styles.css           # 侧边栏样式
│
├── shared/
│   ├── constants.js         # 共享常量
│   └── utils.js             # 工具函数
│
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### 5.2 manifest.json 配置

```json
{
  "manifest_version": 3,
  "name": "Money Signal",
  "version": "0.1.0",
  "description": "从 Twitter 中发现赚钱机会",
  
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://twitter.com/*",
    "https://x.com/*",
    "https://api.your-backend.com/*"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://twitter.com/*",
        "https://x.com/*"
      ],
      "js": ["content/twitter-extractor.js"],
      "run_at": "document_idle"
    }
  ],
  
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}
```

### 5.3 Content Script 核心逻辑

**推文数据提取：**

```javascript
class TwitterExtractor {
  constructor() {
    this.processedTweets = new Set();  // 已处理推文 ID
    this.pendingTweets = [];           // 待发送队列
    this.config = {
      batchSize: 10,
      batchInterval: 30000,
      maxCacheSize: 1000
    };
  }
  
  // 监听新推文加载
  observeNewTweets() {
    const observer = new MutationObserver(() => {
      requestIdleCallback(() => this.scanTweets());
    });
    
    const timeline = document.querySelector('main');
    if (timeline) {
      observer.observe(timeline, { childList: true, subtree: true });
    }
  }
  
  // 提取推文数据
  extractTweetData(element) {
    // 推文 ID
    const tweetLink = element.querySelector('a[href*="/status/"]');
    const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
    
    // 推文文本
    const textElement = element.querySelector('[data-testid="tweetText"]');
    const text = textElement?.innerText || '';
    
    // 作者信息
    const authorElement = element.querySelector('[data-testid="User-Name"]');
    
    // 互动数据
    const engagement = this.extractEngagement(element);
    
    return { id, text, author, engagement, timestamp, url, type };
  }
}
```

**DOM 选择器策略：**

| 元素 | 选择器 |
|-----|--------|
| 推文容器 | `article[data-testid="tweet"]` |
| 推文文本 | `[data-testid="tweetText"]` |
| 作者名 | `[data-testid="User-Name"]` |
| 互动数 | `[role="group"]` 的 `aria-label` |

### 5.4 本地初筛逻辑

在发送到后端前，先用关键词过滤：

```javascript
function preFilter(tweet) {
  const text = tweet.text.toLowerCase();
  
  // 跳过转推和短推文
  if (tweet.type === 'retweet') return false;
  if (tweet.text.length < 50) return false;
  
  // 关键词匹配
  const signalKeywords = {
    demand: ['有没有', '求推荐', 'looking for', '探している'],
    revenue: ['mrr', '月收入', 'revenue', '売上'],
    help: ['求助', 'how to', 'どうやって'],
    willPay: ['愿意付', 'will pay', '有料']
  };
  
  // 任一命中即通过
  for (const category in signalKeywords) {
    for (const keyword of signalKeywords[category]) {
      if (text.includes(keyword)) return true;
    }
  }
  
  // 高互动推文也通过
  if (tweet.engagement.likes > 100) return true;
  
  return false;
}
```

### 5.5 Side Panel 设计

**视觉风格：** 暗色主题，与 Twitter 一致

**信号卡片结构：**
- 信号类型标签（需求/收入/技能/趋势）
- 一句话摘要
- 元信息（作者、时间、互动数）
- 三个操作按钮

---

## 六、后端 Agent 架构

### 6.1 Agent 结构

```
Orchestrator Agent
├── 接收处理后的推文批次
├── 分发给专项 Agent
├── 汇总评分
└── 决定是否推送给用户

专项 Agents (并行执行)：
├── DemandGapAgent：识别需求缺口
├── RevenueProofAgent：识别收入验证
├── SkillMatchAgent：匹配用户技能
└── TrendAgent：识别趋势套利

Tool Functions：
├── search_similar_opportunities()：检索历史相似机会
├── get_user_profile()：获取用户技能画像
├── check_competition()：检查竞品情况
└── generate_action_plan()：生成行动建议
```

### 6.2 技术选型

| 层级 | 技术选型 |
|-----|---------|
| Agent 框架 | Claude Agent SDK |
| API 网关 | Cloudflare Workers / FastAPI |
| 主数据库 | Supabase (PostgreSQL) |
| 向量存储 | Pinecone / Qdrant |
| 缓存 | Redis |
| 部署 | Railway / Fly.io |

---

## 七、开发计划

### Phase 1：MVP 验证（2 周）

**目标：** 验证核心价值——「每天给你发 3 条值得关注的机会」

**范围：**
- [ ] Chrome 插件基础框架
- [ ] Content Script 推文提取
- [ ] 本地关键词初筛
- [ ] 简单后端接收推文
- [ ] Claude API 单次分析
- [ ] 结果发送到 Telegram

**不做：**
- 不做用户系统
- 不做复杂 Agent
- 不做精美 UI

**验证指标：**
- 每天能采集多少条有效推文？
- 分析结果是否真的有用？
- 哪些类型的信号最有价值？

### Phase 2：产品化（4 周）

**目标：** 做成可用的产品

**范围：**
- [ ] 完整的 Side Panel UI
- [ ] 用户反馈循环（保存/行动/忽略）
- [ ] 多 Agent 协作分析
- [ ] 用户技能画像
- [ ] 个性化推荐
- [ ] 信号历史追踪

### Phase 3：扩展（未来）

**可能方向：**
- 更多信号类型
- 更多数据源（LinkedIn, Reddit）
- 团队版
- API 服务

---

## 八、成本估算

### 8.1 MVP 阶段

| 项目 | 月成本 |
|-----|--------|
| 数据采集 | $0（插件方式） |
| Claude API | $20-50 |
| 服务器 (Railway) | $10 |
| **总计** | **$30-60** |

### 8.2 正式产品

| 项目 | 月成本 |
|-----|--------|
| Claude API | $100-300 |
| 服务器 | $50-100 |
| 数据库 (Supabase) | $25-50 |
| 向量数据库 | $20-50 |
| **总计** | **$200-500** |

---

## 九、商业化方向

### 9.1 定价模型

**免费版：**
- 每天 5 条信号
- 基础分析

**Pro 版 ($19/月)：**
- 无限信号
- 深度分析 + 行动建议
- 信号效果追踪
- 高价值账号优先提醒

### 9.2 目标用户获取

- 独立开发者社区（Indie Hackers, Twitter 圈）
- 自由职业者平台
- 出海创业者社群

---

## 十、风险与应对

| 风险 | 应对策略 |
|-----|---------|
| Twitter DOM 结构变化 | 多备选选择器 + 监控告警 |
| 分析结果质量不稳定 | 用户反馈驱动的 Prompt 优化 |
| 用户隐私顾虑 | 明确的数据使用说明，本地优先处理 |
| Claude API 成本上升 | 本地初筛优化，减少 API 调用 |

---

## 附录

### A. 关键词库（多语言）

**需求信号：**
- 中文：有没有、求推荐、在找、需要
- 英文：looking for、anyone know、recommend、need
- 日文：探している、誰か、おすすめ、募集

**收入信号：**
- 中文：月收入、副业、赚了
- 英文：MRR、ARR、revenue、income
- 日文：売上、収益、稼

**付费意愿：**
- 中文：愿意付、付费
- 英文：will pay、paying for
- 日文：有料、払う

### B. 参考资源

- Chrome Extension Manifest V3 文档
- Claude Agent SDK 文档
- Twitter DOM 结构分析
- Alan Cooper《About Face》设计方法论

---

*文档版本：v1.0*  
*最后更新：2026年1月1日*
