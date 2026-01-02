TSF (趋势信号) 浏览器插件 - 完整产品规格说明书

版本: v1.0 | 设计理念: 目标导向设计 (Goal-Directed Design) | 目标读者: AI Coder


📋 文档目录

产品概述
核心用户流程
功能模块详解
数据结构定义
UI组件规格
交互行为规范
AI集成接口
技术架构要求


1. 产品概述
1.1 产品定位
一个 Chrome 浏览器插件，在用户浏览 Twitter (X.com) 时，后台自动检测并筛选高价值推文，通过侧边栏呈现 AI 生成的洞察摘要。
1.2 核心价值主张

被动智能：用户无需主动操作，系统后台自动工作
主动控制：用户随时可以查看、调整、反馈
渐进式信任：通过透明的匹配原因建立用户信任

1.3 目标用户画像

开发者：关注技术趋势、开源项目、API发布
创业者：关注融资信息、商业模式、市场机会
创作者：关注热点话题、内容灵感、爆款案例

1.4 技术栈要求
前端: React 18+ + TypeScript + Vite
样式: Tailwind CSS + CSS Variables
状态管理: Zustand 或 Jotai (轻量级)
Chrome API: Manifest V3
通信: Chrome Message Passing API
持久化: Chrome Storage API (sync + local)

2. 核心用户流程
2.1 首次使用流程 (Onboarding)
触发时机: 用户安装插件后首次访问 Twitter (X.com)

步骤序列:
┌─────────────────────────────────────────┐
│ 1. 欢迎浮层 (Welcome Modal)              │
│    - 半透明黑色遮罩 (opacity: 0.6)       │
│    - 中央白色卡片 (max-width: 480px)     │
│    - 标题: "👋 欢迎使用趋势信号 (TSF)"    │
│    - 副标题: "花 1 分钟配置你的专属雷达"  │
│    - 主按钮: "开始配置"                   │
│    - 次级链接: "稍后设置 (使用默认配置)"  │
└─────────────────────────────────────────┘
          ↓ 用户点击 "开始配置"
┌─────────────────────────────────────────┐
│ 2. 身份选择 (Persona Selection)          │
│    - 问题: "你的主要身份是？"             │
│    - 三个大按钮 (单选):                   │
│      [👨‍💻 开发者]                         │
│        → 子标签: 技术趋势、开源项目       │
│      [💼 创业者]                          │
│        → 子标签: 商业模式、融资信息       │
│      [✍️ 创作者]                          │
│        → 子标签: 热点话题、内容灵感       │
│    - 底部提示: "这会影响推荐的关注领域"   │
│    - 主按钮: "下一步"                     │
│    - 次级按钮: "上一步"                   │
└─────────────────────────────────────────┘
          ↓ 用户选择后点击 "下一步"
┌─────────────────────────────────────────┐
│ 3. 兴趣领域选择 (Interest Selection)      │
│    - 标题: "选择你的关注领域 (3-5个)"     │
│    - 根据身份显示预设标签 (可多选):        │
│      开发者 → 默认勾选:                   │
│        ✓ AI与机器学习                     │
│        ✓ 前端开发                         │
│        ✓ 开源项目                         │
│      未勾选:                              │
│        ☐ Web3与区块链                     │
│        ☐ 移动开发                         │
│        ☐ DevOps与云服务                   │
│        ... (共12-15个标签)                │
│    - 选中计数器: "已选择 3/5"             │
│    - 主按钮: "下一步" (至少选3个才激活)   │
│    - 次级按钮: "上一步"                   │
└─────────────────────────────────────────┘
          ↓ 用户选择后点击 "下一步"
┌─────────────────────────────────────────┐
│ 4. 自定义关键词 (Custom Keywords)         │
│    - 标题: "添加特定关键词 (可选)"        │
│    - 说明: "输入你特别关注的话题或产品"   │
│    - 输入框 (支持多标签输入):             │
│      [AI Agent] [Rust] [日本市场] [+]    │
│    - 输入提示: "回车添加关键词..."        │
│    - 示例提示: "如: ChatGPT, Next.js..."  │
│    - 主按钮: "完成配置"                   │
│    - 次级按钮: "上一步"                   │
│    - 跳过链接: "跳过此步骤"               │
└─────────────────────────────────────────┘
          ↓ 用户点击 "完成配置"
┌─────────────────────────────────────────┐
│ 5. 初始化扫描 (Initial Scan)             │
│    - 进度卡片 (居中显示):                 │
│      "正在启动你的雷达..."               │
│      [=========>      ] 60%              │
│      "正在分析你的 Twitter Likes..."     │
│    - 步骤说明:                            │
│      ✓ 已获取最近 100 条 Likes            │
│      ⏳ 正在提取兴趣关键词...             │
│      ⏹ 待扫描时间线...                   │
│    - 预计时间: "大约需要 10 秒"           │
└─────────────────────────────────────────┘
          ↓ 扫描完成 (3-10秒后)
┌─────────────────────────────────────────┐
│ 6. 完成提示 (Completion)                 │
│    - 成功动画 (绿色对勾展开)              │
│    - 标题: "✅ 雷达已启动！"               │
│    - 结果预览:                            │
│      "已为你发现 5 条高价值信号"          │
│      "匹配你关注的 AI与机器学习 领域"     │
│    - 主按钮: "查看信号" (跳转侧边栏)      │
│    - 次级链接: "稍后查看"                 │
│    - 自动关闭: 5秒后自动淡出              │
└─────────────────────────────────────────┘
状态持久化要求:
javascript// 存储在 chrome.storage.sync
onboardingState = {
  completed: true,
  timestamp: "2025-01-02T10:30:00Z",
  userProfile: {
    persona: "developer",
    interests: ["ai_ml", "frontend", "opensource"],
    customKeywords: ["AI Agent", "Rust", "日本市场"]
  }
}
```

---

### 2.2 日常使用流程 (Daily Usage)
```
前置条件: 用户已完成首次配置

自动扫描机制:
┌─────────────────────────────────────────┐
│ 后台服务 (Background Service Worker)     │
│ - 监听页面变化: DOM Mutation Observer    │
│ - 检测时机: 用户每滚动10条推文触发一次   │
│ - 批量抓取: 将新推文数据发送到后端        │
│ - 去重逻辑: 基于 tweetId 避免重复分析    │
└─────────────────────────────────────────┘
          ↓ 每隔 5 秒批量分析
┌─────────────────────────────────────────┐
│ 后端 AI 分析                             │
│ - 输入: 10条推文的 JSON 数组             │
│ - 处理: AI 评分 + 分类 + 生成摘要        │
│ - 输出: 高价值信号 (score > 70)          │
└─────────────────────────────────────────┘
          ↓ 发现新信号
┌─────────────────────────────────────────┐
│ 前端状态更新                             │
│ - 更新徽章数字: "3" (带淡入动画)         │
│ - 更新图标颜色: 灰色 → 橙色              │
│ - 本地通知 (可选): "发现 3 条新信号"     │
└─────────────────────────────────────────┘
```

**用户主动查看流程:**
```
用户点击浏览器工具栏的 TSF 图标
          ↓
┌─────────────────────────────────────────┐
│ 侧边栏滑入 (Sidebar Slide-in)            │
│ - 动画: 从右侧滑入, 300ms ease-out       │
│ - 宽度: 420px                            │
│ - 高度: 100vh (全屏高度)                 │
│ - 背景: 白色 (宁静模式) / 跟随主题       │
│ - 阴影: 左侧投影 (模拟浮层效果)          │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ 侧边栏内容结构 (从上到下)                │
│                                          │
│ 1. 顶部状态栏 (Sticky)                   │
│    ├─ 左侧: "雷达状态" 指示灯            │
│    │   ● 绿色脉冲 = 运行中                │
│    │   ● 灰色 = 暂停                      │
│    ├─ 中间: "已扫描 127 条"              │
│    └─ 右侧: 设置齿轮图标                 │
│                                          │
│ 2. 分类标签栏 (Tabs)                     │
│    [全部 8] [技术 3] [商业 2] [搞钱 1]   │
│    - 激活标签: 橙色下划线 + 加粗         │
│    - 数字徽章: 显示该分类信号数量         │
│                                          │
│ 3. 信号卡片列表 (Scrollable)             │
│    └─ 见下方 "信号卡片组件"              │
│                                          │
│ 4. 底部操作栏 (Sticky)                   │
│    ├─ "刷新雷达" 按钮                    │
│    └─ "清空已读" 链接                    │
└─────────────────────────────────────────┘
```

---

### 2.3 反馈与训练流程
```
用户在信号卡片上点击反馈按钮
          ↓
┌─────────────────────────────────────────┐
│ 反馈操作                                 │
│ - 👍 这个有用                            │
│   → 提高该分类权重 +5%                   │
│   → 记录用户偏好: {"categoryId": "...", │
│                    "action": "upvote"}  │
│                                          │
│ - 👎 不感兴趣                            │
│   → 降低该分类权重 -5%                   │
│   → 隐藏该卡片 (淡出动画)                │
│                                          │
│ - ⚠️ 误判                               │
│   → 标记为错误分类                       │
│   → 弹出二次确认: "应该归类到哪里？"     │
│     [选择正确分类下拉菜单]               │
└─────────────────────────────────────────┘
          ↓ 实时更新
┌─────────────────────────────────────────┐
│ 权重调整逻辑 (在后端)                    │
│ - 读取用户配置: userProfile.interests    │
│ - 更新权重: weight = oldWeight * factor  │
│ - 重新评分: 影响后续推文的匹配度         │
└─────────────────────────────────────────┘
          ↓ 每周生成
┌─────────────────────────────────────────┐
│ 洞察报告 (Weekly Insight)                │
│ - 触发时机: 每周日晚上 8 点              │
│ - 通知方式: 浏览器通知 + 侧边栏顶部横幅  │
│ - 报告内容:                              │
│   "本周发现 47 条信号"                   │
│   "你最关注: AI工具 (45%), 独立开发 (30%)"|
│   "建议调整: Web3 内容反馈少，移除？"    │
│ - 操作按钮:                              │
│   [查看详情] [调整设置] [下周再说]       │
└─────────────────────────────────────────┘

3. 功能模块详解
3.1 内容捕获模块 (Content Capture)
职责: 从 Twitter 页面抓取推文数据
实现要求:
javascript// Content Script (运行在 Twitter 页面上下文)

class TweetCapture {
  constructor() {
    this.observer = null;
    this.capturedTweets = new Set(); // 去重
    this.batchQueue = [];
    this.BATCH_SIZE = 10;
  }

  // 启动监听
  start() {
    // 监听 DOM 变化
    this.observer = new MutationObserver((mutations) => {
      this.detectNewTweets(mutations);
    });

    // 监听 Twitter 的推文容器
    const feedContainer = document.querySelector('[data-testid="primaryColumn"]');
    this.observer.observe(feedContainer, {
      childList: true,
      subtree: true
    });
  }

  // 检测新推文
  detectNewTweets(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (this.isTweetElement(node)) {
          const tweetData = this.extractTweetData(node);
          if (!this.capturedTweets.has(tweetData.tweetId)) {
            this.batchQueue.push(tweetData);
            this.capturedTweets.add(tweetData.tweetId);
          }
        }
      });
    });

    // 批量发送
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.sendBatch();
    }
  }

  // 判断是否为推文元素
  isTweetElement(node) {
    // Twitter 推文的特征选择器
    return node.querySelector?.('[data-testid="tweet"]') !== null;
  }

  // 提取推文数据
  extractTweetData(element) {
    // 需要提取的字段
    return {
      tweetId: this.getTweetId(element),
      authorHandle: this.getAuthorHandle(element),
      authorName: this.getAuthorName(element),
      content: this.getContent(element),
      timestamp: this.getTimestamp(element),
      engagement: {
        replies: this.getReplies(element),
        retweets: this.getRetweets(element),
        likes: this.getLikes(element),
        views: this.getViews(element)
      },
      media: this.getMedia(element), // 图片、视频链接
      links: this.getLinks(element), // 外部链接
      tweetUrl: this.getTweetUrl(element)
    };
  }

  // 批量发送到后端
  async sendBatch() {
    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    // 通过 Chrome Message API 发送到 Background
    chrome.runtime.sendMessage({
      type: 'ANALYZE_TWEETS',
      data: batch
    });
  }

  // 辅助方法: 提取各个字段
  getTweetId(element) {
    // 从推文链接中提取 ID
    const link = element.querySelector('a[href*="/status/"]');
    return link?.href.match(/status\/(\d+)/)?.[1];
  }

  getAuthorHandle(element) {
    // 提取 @username
    return element.querySelector('[data-testid="User-Name"] a')?.textContent;
  }

  getContent(element) {
    // 提取推文文本
    return element.querySelector('[data-testid="tweetText"]')?.textContent;
  }

  getEngagement(element, testId) {
    // 提取互动数据
    const button = element.querySelector(`[data-testid="${testId}"]`);
    return this.parseEngagementNumber(button?.textContent);
  }

  parseEngagementNumber(text) {
    // 将 "2.3K" 转换为 2300
    if (!text) return 0;
    const match = text.match(/([\d.]+)([KMB]?)/);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const suffix = match[2];
    const multiplier = { K: 1000, M: 1000000, B: 1000000000 }[suffix] || 1;
    return Math.round(num * multiplier);
  }
}

// 初始化
const capture = new TweetCapture();
capture.start();
关键技术点:

使用 MutationObserver 监听 DOM 变化
使用 data-testid 属性定位元素（Twitter 的特征）
批量处理避免频繁通信
去重机制避免重复分析


3.2 后台服务模块 (Background Service)
职责: 接收推文数据，调用后端 API 分析，存储结果
实现要求:
javascript// Background Service Worker (Manifest V3)

class BackgroundService {
  constructor() {
    this.API_BASE = 'http://localhost:3001';
    this.signalCache = [];
    this.isAnalyzing = false;
  }

  // 监听来自 Content Script 的消息
  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ANALYZE_TWEETS') {
        this.analyzeTweets(message.data);
      }
    });
  }

  // 分析推文
  async analyzeTweets(tweets) {
    if (this.isAnalyzing) {
      console.log('Already analyzing, queuing...');
      return;
    }

    this.isAnalyzing = true;

    try {
      // 1. 获取用户配置
      const userProfile = await this.getUserProfile();

      // 2. 调用后端 API
      const response = await fetch(`${this.API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: tweets,
          userProfile: userProfile
        })
      });

      const result = await response.json();
      // result.signals = [{ tweetId, category, score, summary, matchReasons }]

      // 3. 过滤高价值信号 (score >= 70)
      const highValueSignals = result.signals.filter(s => s.score >= 70);

      // 4. 存储到本地
      await this.saveSignals(highValueSignals);

      // 5. 更新徽章
      await this.updateBadge(highValueSignals.length);

      // 6. 发送通知 (可选)
      if (highValueSignals.length > 0) {
        this.sendNotification(highValueSignals.length);
      }

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  // 获取用户配置
  async getUserProfile() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['userProfile'], (result) => {
        resolve(result.userProfile || this.getDefaultProfile());
      });
    });
  }

  // 保存信号
  async saveSignals(signals) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['signals'], (result) => {
        const existing = result.signals || [];
        const updated = [...existing, ...signals];
        chrome.storage.local.set({ signals: updated }, resolve);
      });
    });
  }

  // 更新徽章
  async updateBadge(count) {
    // 获取当前未读数量
    const current = await this.getUnreadCount();
    const newCount = current + count;

    chrome.action.setBadgeText({ text: newCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#d97706' }); // 橙色
  }

  // 发送通知
  sendNotification(count) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: '趋势信号 (TSF)',
      message: `发现 ${count} 条新信号`,
      priority: 1
    });
  }

  // 获取未读数量
  async getUnreadCount() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['signals'], (result) => {
        const signals = result.signals || [];
        const unread = signals.filter(s => !s.read).length;
        resolve(unread);
      });
    });
  }
}

// 初始化
const service = new BackgroundService();
service.init();
```

---

### 3.3 侧边栏 UI 模块 (Sidebar)

**职责:** 展示信号列表，处理用户交互

**React 组件结构:**
```
<Sidebar>
  ├─ <StatusBar />          // 顶部状态栏
  ├─ <CategoryTabs />       // 分类标签
  ├─ <SignalList />         // 信号列表
  │   └─ <SignalCard />     // 单个信号卡片 (多个)
  └─ <ActionBar />          // 底部操作栏
核心组件实现要求:
3.3.1 StatusBar 组件
typescriptinterface StatusBarProps {
  isScanning: boolean;      // 是否正在扫描
  scannedCount: number;     // 已扫描数量
  signalCount: number;      // 发现信号数量
  onSettingsClick: () => void;
}

// 渲染要求:
<div className="status-bar">
  {/* 左侧状态指示灯 */}
  <div className="status-indicator">
    <div className={`pulse-dot ${isScanning ? 'active' : ''}`} />
    <span>雷达运行中</span>
  </div>

  {/* 中间统计信息 */}
  <div className="stats">
    <span>已扫描 {scannedCount} 条</span>
    <span className="divider">|</span>
    <span>发现 {signalCount} 条信号</span>
  </div>

  {/* 右侧设置按钮 */}
  <button onClick={onSettingsClick}>
    <SettingsIcon />
  </button>
</div>

// CSS 要求:
.status-bar {
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af; // 灰色
}

.pulse-dot.active {
  background: #10b981; // 绿色
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
3.3.2 CategoryTabs 组件
typescriptinterface Category {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

// 渲染要求:
<div className="category-tabs">
  <div className="tabs-container">
    {categories.map(cat => (
      <button
        key={cat.id}
        className={`tab ${activeCategory === cat.id ? 'active' : ''}`}
        onClick={() => onCategoryChange(cat.id)}
      >
        {cat.icon && <span className="icon">{cat.icon}</span>}
        <span className="label">{cat.label}</span>
        {cat.count > 0 && (
          <span className="badge">{cat.count}</span>
        )}
      </button>
    ))}
  </div>
</div>

// CSS 要求:
.category-tabs {
  position: sticky;
  top: 52px; // 紧贴 StatusBar 下方
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  z-index: 9;
}

.tabs-container {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--hover-bg);
}

.tab.active {
  border-color: #d97706;
  background: #fef3c7;
  font-weight: 600;
}

.tab .badge {
  background: #d97706;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
3.3.3 SignalCard 组件
typescriptinterface Signal {
  signalId: string;
  tweetId: string;
  category: string;
  score: number;
  aiSummary: string;
  matchReasons: MatchReason[];
  tweet: {
    authorName: string;
    authorHandle: string;
    content: string;
    timestamp: string;
    engagement: {
      likes: number;
      retweets: number;
    };
    tweetUrl: string;
  };
  userFeedback?: 'useful' | 'not_interested' | 'wrong';
  bookmarked: boolean;
  read: boolean;
}

interface MatchReason {
  type: 'keyword' | 'engagement' | 'timing' | 'related_account';
  value: string;
  weight: number;
}

interface SignalCardProps {
  signal: Signal;
  onFeedback: (signalId: string, feedback: string) => void;
  onBookmark: (signalId: string) => void;
  onOpenTweet: (tweetUrl: string) => void;
}

// 渲染要求:
<div className="signal-card">
  {/* 顶部元信息 */}
  <div className="card-header">
    <div className="author-info">
      <span className="author-name">{signal.tweet.authorName}</span>
      <span className="author-handle">@{signal.tweet.authorHandle}</span>
    </div>
    <div className="score-badge">{signal.score}/100</div>
  </div>

  {/* AI 摘要 */}
  <div className="ai-summary">
    <div className="summary-icon">✨</div>
    <p>{signal.aiSummary}</p>
  </div>

  {/* 匹配原因标签 */}
  <div className="match-reasons">
    {signal.matchReasons.map((reason, idx) => (
      <div key={idx} className="reason-tag">
        {this.getReasonIcon(reason.type)}
        <span>{reason.value}</span>
      </div>
    ))}
  </div>

  {/* 原推文预览 (可折叠) */}
  <details className="tweet-preview">
    <summary>查看原推文</summary>
    <div className="tweet-content">
      <p>{signal.tweet.content}</p>
      <div className="engagement">
        <span>❤️ {this.formatNumber(signal.tweet.engagement.likes)}</span>
        <span>🔄 {this.formatNumber(signal.tweet.engagement.retweets)}</span>
      </div>
    </div>
  </details>

  {/* 操作按钮 */}
  <div className="card-actions">
    <button 
      className="action-btn"
      onClick={() => onOpenTweet(signal.tweet.tweetUrl)}
    >
      打开原文
    </button>
    <button 
      className={`action-btn bookmark ${signal.bookmarked ? 'active' : ''}`}
      onClick={() => onBookmark(signal.signalId)}
    >
      {signal.bookmarked ? '已收藏' : '收藏'}
    </button>
  </div>

  {/* 反馈按钮 */}
  <div className="feedback-bar">
    <button onClick={() => onFeedback(signal.signalId, 'useful')}>
      👍 有用
    </button>
    <button onClick={() => onFeedback(signal.signalId, 'not_interested')}>
      👎 不感兴趣
    </button>
    <button onClick={() => onFeedback(signal.signalId, 'wrong')}>
      ⚠️ 误判
    </button>
  </div>
</div>

// CSS 要求:
.signal-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
}

.signal-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.ai-summary {
  display: flex;
  gap: 8px;
  background: #fef3c7;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #d97706;
  margin: 12px 0;
}

.match-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.reason-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--tag-bg);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.feedback-bar {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  margin-top: 12px;
}

.feedback-bar button {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.feedback-bar button:hover {
  background: var(--hover-bg);
  border-color: #d97706;
}
```

---

### 3.4 设置面板模块 (Settings Panel)

**职责:** 让用户调整雷达配置

**面板结构:**
```
<SettingsPanel>
  ├─ <ScanSettings />       // 扫描设置
  ├─ <InterestSettings />   // 兴趣设置
  ├─ <DisplaySettings />    // 显示设置
  └─ <DataManagement />     // 数据管理
实现要求:
3.4.1 扫描设置
typescriptinterface ScanSettingsState {
  autoScanEnabled: boolean;     // 是否自动扫描
  scanBatchSize: 10 | 20 | 50;  // 批量大小
  sensitivity: 'high' | 'medium' | 'low'; // 敏感度
  minScore: number;             // 最低分数阈值 (70-90)
}

// UI 要求:
<section className="settings-section">
  <h3>扫描设置</h3>
  
  {/* 自动扫描开关 */}
  <div className="setting-item">
    <label>
      <span>自动扫描</span>
      <span className="description">后台自动分析时间线</span>
    </label>
    <Toggle 
      checked={autoScanEnabled}
      onChange={handleToggle}
    />
  </div>

  {/* 批量大小滑块 */}
  <div className="setting-item">
    <label>
      <span>扫描范围</span>
      <span className="description">每次分析的推文数量</span>
    </label>
    <Slider
      min={10}
      max={50}
      step={10}
      value={scanBatchSize}
      onChange={handleBatchSizeChange}
    />
    <span className="value-display">{scanBatchSize} 条</span>
  </div>

  {/* 敏感度选择 */}
  <div className="setting-item">
    <label>
      <span>信号敏感度</span>
      <span className="description">调整推荐的严格程度</span>
    </label>
    <SegmentedControl
      options={[
        { value: 'high', label: '严格' },
        { value: 'medium', label: '平衡' },
        { value: 'low', label: '宽松' }
      ]}
      value={sensitivity}
      onChange={handleSensitivityChange}
    />
  </div>

  {/* 最低分数阈值 */}
  <div className="setting-item">
    <label>
      <span>最低分数</span>
      <span className="description">低于此分数的信号将被过滤</span>
    </label>
    <NumberInput
      min={70}
      max={90}
      value={minScore}
      onChange={handleMinScoreChange}
    />
  </div>
</section>
3.4.2 兴趣设置
typescript// UI 要求:
<section className="settings-section">
  <h3>兴趣设置</h3>
  
  {/* 已选兴趣 */}
  <div className="interest-list">
    {userInterests.map(interest => (
      <div key={interest.id} className="interest-item">
        <div className="interest-info">
          <span className="label">{interest.label}</span>
          <span className="weight">权重: {interest.weight}%</span>
        </div>
        <button 
          className="remove-btn"
          onClick={() => removeInterest(interest.id)}
        >
          ✕
        </button>
      </div>
    ))}
  </div>

  {/* 添加新兴趣 */}
  <button 
    className="add-interest-btn"
    onClick={openInterestPicker}
  >
    + 添加新领域
  </button>

  {/* 自定义关键词 */}
  <div className="custom-keywords">
    <label>自定义关键词</label>
    <TagInput
      tags={customKeywords}
      onAdd={addKeyword}
      onRemove={removeKeyword}
      placeholder="输入关键词后回车..."
    />
  </div>

  {/* 权重重置按钮 */}
  <button 
    className="reset-btn secondary"
    onClick={resetWeights}
  >
    重置所有权重
  </button>
</section>
3.4.3 显示设置
typescriptinterface DisplaySettings {
  theme: 'serene' | 'contrast' | 'dark'; // 视觉模式
  cardDensity: 'comfortable' | 'compact'; // 卡片密度
  showEngagement: boolean;      // 显示互动数据
  showMatchReasons: boolean;    // 显示匹配原因
  autoExpandTweet: boolean;     // 自动展开原推文
}

// UI 要求:
<section className="settings-section">
  <h3>显示设置</h3>
  
  {/* 视觉模式选择 */}
  <div className="setting-item">
    <label>视觉模式</label>
    <div className="theme-picker">
      <ThemeOption 
        theme="serene"
        label="宁静模式"
        preview={<SerenePreview />}
      />
      <ThemeOption 
        theme="contrast"
        label="对比模式"
        preview={<ContrastPreview />}
      />
      <ThemeOption 
        theme="dark"
        label="暗夜模式"
        preview={<DarkPreview />}
      />
    </div>
  </div>

  {/* 卡片密度 */}
  <div className="setting-item">
    <label>卡片密度</label>
    <SegmentedControl
      options={[
        { value: 'comfortable', label: '舒适' },
        { value: 'compact', label: '紧凑' }
      ]}
      value={cardDensity}
    />
  </div>

  {/* 其他开关 */}
  <div className="setting-item">
    <label>显示互动数据</label>
    <Toggle checked={showEngagement} />
  </div>
  <div className="setting-item">
    <label>显示匹配原因</label>
    <Toggle checked={showMatchReasons} />
  </div>
</section>

4. 数据结构定义
4.1 用户配置 (UserProfile)
typescriptinterface UserProfile {
  userId: string;              // Twitter handle
  persona: 'developer' | 'entrepreneur' | 'creator';
  interests: Interest[];
  customKeywords: string[];
  scanSettings: ScanSettings;
  displaySettings: DisplaySettings;
  createdAt: string;           // ISO timestamp
  lastUpdated: string;
}

interface Interest {
  categoryId: string;          // 如 "ai_ml", "frontend"
  label: string;               // 显示名称
  weight: number;              // 0.0 - 1.0
  keywords: string[];          // 关联关键词
  enabled: boolean;
}

interface ScanSettings {
  autoScanEnabled: boolean;
  scanBatchSize: 10 | 20 | 50;
  sensitivity: 'high' | 'medium' | 'low';
  minScore: number;            // 70-90
}

interface DisplaySettings {
  theme: 'serene' | 'contrast' | 'dark';
  cardDensity: 'comfortable' | 'compact';
  showEngagement: boolean;
  showMatchReasons: boolean;
  autoExpandTweet: boolean;
}
4.2 推文数据 (Tweet)
typescriptinterface Tweet {
  tweetId: string;             // Twitter 推文 ID
  authorHandle: string;        // @username
  authorName: string;          // 显示名称
  content: string;             // 推文文本
  timestamp: string;           // ISO timestamp
  engagement: Engagement;
  media: Media[];              // 媒体文件
  links: string[];             // 外部链接
  tweetUrl: string;            // 推文完整 URL
  capturedAt: string;          // 捕获时间
}

interface Engagement {
  replies: number;
  retweets: number;
  likes: number;
  views: number;
}

interface Media {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
}
4.3 信号数据 (Signal)
typescriptinterface Signal {
  signalId: string;            // UUID
  tweetId: string;             // 关联推文
  userId: string;              // 关联用户
  category: string;            // 分类 ID
  score: number;               // 0-100
  aiSummary: string;           // AI 生成摘要
  matchReasons: MatchReason[];
  tweet: Tweet;                // 嵌入完整推文数据
  
  // 用户交互状态
  userFeedback?: 'useful' | 'not_interested' | 'wrong';
  bookmarked: boolean;
  read: boolean;
  
  // 时间戳
  detectedAt: string;
  readAt?: string;
  feedbackAt?: string;
}

interface MatchReason {
  type: 'keyword' | 'engagement' | 'timing' | 'related_account';
  value: string;               // 具体内容
  weight: number;              // 贡献权重 0.0-1.0
  explanation?: string;        // 可选说明
}
4.4 分类定义 (Category)
typescriptinterface Category {
  id: string;
  label: string;
  icon: string;                // Emoji 或 Icon 名称
  description: string;
  defaultKeywords: string[];   // 预设关键词
  color: string;               // 主题色
}

// 预设分类列表
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'tech_products',
    label: '技术与产品',
    icon: '📱',
    description: 'AI突破、新工具发布、Web3动态',
    defaultKeywords: ['AI', 'API', '开源', 'framework', 'library'],
    color: '#3b82f6'
  },
  {
    id: 'business_startup',
    label: '商业与创业',
    icon: '💼',
    description: '融资新闻、独立开发者故事、增长策略',
    defaultKeywords: ['融资', 'IPO', '创业', 'startup', 'founder'],
    color: '#8b5cf6'
  },
  {
    id: 'monetization',
    label: '收入与变现',
    icon: '💰',
    description: '副业机会、收入报告、自由职业',
    defaultKeywords: ['赚钱', '副业', 'MRR', 'revenue', 'freelance'],
    color: '#10b981'
  },
  {
    id: 'data_insights',
    label: '数据与洞察',
    icon: '📊',
    description: '行业报告、增长指标、趋势分析',
    defaultKeywords: ['数据', '报告', 'metrics', 'analytics', 'trends'],
    color: '#f59e0b'
  },
  {
    id: 'skills_learning',
    label: '技能与学习',
    icon: '🎯',
    description: '教程指南、设计技巧、效率工具',
    defaultKeywords: ['教程', '学习', 'tutorial', 'guide', 'tips'],
    color: '#ec4899'
  },
  {
    id: 'opinions',
    label: '观点与讨论',
    icon: '💡',
    description: '深度长文、热门观点、行业争议',
    defaultKeywords: ['思考', '观点', 'opinion', 'debate', 'thread'],
    color: '#6366f1'
  },
  {
    id: 'trending',
    label: '社会热点',
    icon: '🔥',
    description: '突发新闻和重大事件',
    defaultKeywords: ['breaking', '突发', 'news', '热点'],
    color: '#ef4444'
  }
];

5. UI组件规格
5.1 视觉主题 (Theme Variables)
css/* 宁静模式 (Serene) - 默认 */
:root[data-theme="serene"] {
  /* 背景色 */
  --bg-primary: #faf8f5;       /* 淡米色 */
  --bg-secondary: #f5f1ed;
  --card-bg: #ffffff;
  --hover-bg: #f0ebe6;
  
  /* 文字色 */
  --text-primary: #2d2d2d;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  
  /* 边框色 */
  --border-color: #e5e1dc;
  --border-hover: #d1ccc6;
  
  /* 强调色 */
  --accent-color: #d97706;     /* 琥珀色 */
  --accent-hover: #b45309;
  --accent-light: #fef3c7;
  
  /* 标签背景 */
  --tag-bg: #f3f4f6;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}

/* 对比模式 (Contrast) */
:root[data-theme="contrast"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --card-bg: #ffffff;
  --hover-bg: #f3f4f6;
  
  --text-primary: #000000;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;
  
  --border-color: #e5e7eb;
  --border-hover: #d1d5db;
  
  --accent-color: #0066cc;
  --accent-hover: #0052a3;
  --accent-light: #dbeafe;
  
  --tag-bg: #f3f4f6;
}

/* 暗夜模式 (Dark) */
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #262626;
  --card-bg: #2d2d2d;
  --hover-bg: #3a3a3a;
  
  --text-primary: #e5e5e5;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  
  --border-color: #404040;
  --border-hover: #525252;
  
  --accent-color: #fbbf24;
  --accent-hover: #f59e0b;
  --accent-light: #451a03;
  
  --tag-bg: #3a3a3a;
}
5.2 排版规范 (Typography)
css/* 字体栈 */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
               "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* 标题 */
h1 { font-size: 24px; font-weight: 700; line-height: 1.3; }
h2 { font-size: 20px; font-weight: 600; line-height: 1.4; }
h3 { font-size: 16px; font-weight: 600; line-height: 1.4; }
h4 { font-size: 14px; font-weight: 600; line-height: 1.4; }

/* 正文 */
p { font-size: 14px; line-height: 1.6; }
.small { font-size: 12px; line-height: 1.5; }
.tiny { font-size: 11px; line-height: 1.4; }

/* 代码 */
code {
  font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
  font-size: 13px;
  background: var(--tag-bg);
  padding: 2px 6px;
  border-radius: 3px;
}
5.3 间距系统 (Spacing)
css:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}

/* 使用示例 */
.card {
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
5.4 动画规范 (Animations)
css/* 缓动函数 */
:root {
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0.0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}

/* 淡入淡出 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* 滑入滑出 */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slideOutRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* 应用示例 */
.sidebar {
  animation: slideInRight 0.3s var(--ease-out);
}

.badge-update {
  animation: pulse 0.5s var(--ease-in-out);
}
```

---

## 6. 交互行为规范

### 6.1 侧边栏行为

**打开侧边栏:**
```
触发: 用户点击浏览器工具栏的 TSF 图标

行为序列:
1. 检查是否已打开
   - 如果已打开 → 无操作
   - 如果未打开 → 继续
2. 注入侧边栏 DOM
3. 执行滑入动画 (300ms)
4. 加载信号数据
5. 更新徽章为 "0" (清除未读标记)
6. 将焦点移到侧边栏内部

动画要求:
- 从右侧滑入 (translateX: 100% → 0)
- 缓动函数: cubic-bezier(0.0, 0, 0.2, 1)
- 背景遮罩同步淡入 (opacity: 0 → 0.3)
```

**关闭侧边栏:**
```
触发: 
- 用户点击侧边栏外部遮罩
- 用户按 ESC 键
- 用户再次点击 TSF 图标

行为序列:
1. 执行滑出动画 (300ms)
2. 背景遮罩淡出
3. 移除侧边栏 DOM
4. 恢复页面滚动 (如果被锁定)

动画要求:
- 向右滑出 (translateX: 0 → 100%)
- 缓动函数: cubic-bezier(0.4, 0, 1, 1)
```

### 6.2 信号卡片交互

**展开/折叠原推文:**
```
触发: 用户点击 "查看原推文" 摘要

行为:
- 使用原生 <details> 元素
- 展开动画: 从高度 0 → auto (200ms)
- 折叠动画: 从 auto → 0 (200ms)

实现提示:
<details>
  <summary>查看原推文 <ChevronIcon /></summary>
  <div className="tweet-content">...</div>
</details>

CSS:
details[open] summary svg {
  transform: rotate(180deg);
  transition: transform 0.2s;
}
```

**反馈操作:**
```
触发: 用户点击反馈按钮 (👍/👎/⚠️)

行为序列:
1. 按钮视觉反馈 (缩放动画)
2. 发送反馈到后端
3. 更新卡片状态:
   - 👍 → 按钮变绿色 + "已标记有用"
   - 👎 → 卡片淡出 + 从列表移除 (500ms后)
   - ⚠️ → 弹出分类选择器

反馈误判流程:
1. 点击 "⚠️ 误判"
2. 弹出模态框:
   "这条信号应该归类到哪里？"
   [下拉菜单: 选择正确分类]
   [确认] [取消]
3. 提交后:
   - 更新信号分类
   - 显示 Toast: "感谢反馈，已调整分类"
```

**收藏操作:**
```
触发: 用户点击 "收藏" 按钮

行为:
- 未收藏 → 已收藏:
  * 按钮文字: "收藏" → "已收藏"
  * 按钮样式: 边框 → 填充 (橙色背景)
  * 图标动画: 星星从空心变实心 + 缩放效果

- 已收藏 → 未收藏:
  * 按钮文字: "已收藏" → "收藏"
  * 按钮样式: 填充 → 边框
  * 图标动画: 星星从实心变空心

持久化: 立即保存到 chrome.storage.local
```

### 6.3 分类切换交互

**切换分类:**
```
触发: 用户点击分类标签

行为序列:
1. 标签视觉更新 (立即):
   - 取消旧标签的 active 状态
   - 激活新标签 (橙色边框 + 背景)
2. 列表内容更新:
   - 方案A (交叉淡入淡出):
     * 旧列表淡出 (200ms)
     * 新列表淡入 (200ms, delay 100ms)
   - 方案B (无动画):
     * 直接替换内容
3. 滚动到顶部 (平滑滚动)

性能优化:
- 使用虚拟滚动 (如果信号数量 > 50)
- 懒加载卡片组件
```

### 6.4 设置面板交互

**打开设置:**
```
触发: 用户点击顶部状态栏的设置图标

行为:
1. 侧边栏内容滑出 (向左)
2. 设置面板滑入 (从右)
3. 面板标题显示 "← 返回" 按钮

动画要求:
- 两个面板同时移动 (协调动画)
- 持续时间: 300ms
- 缓动函数: ease-in-out
```

**保存设置:**
```
触发: 
- 用户修改任何设置项
- 自动保存 (debounce 500ms)

行为:
1. 更新本地状态
2. 保存到 chrome.storage.sync
3. 通知后端更新用户配置
4. 显示保存提示 (可选 Toast)
```

---

## 7. AI集成接口

### 7.1 后端 API 设计

**端点 1: 分析推文**
```
POST /api/analyze

请求体:
{
  "tweets": Tweet[],
  "userProfile": UserProfile
}

响应体:
{
  "signals": [
    {
      "tweetId": "1234567890",
      "category": "tech_products",
      "score": 85,
      "aiSummary": "OpenAI 发布新的 Agent SDK，支持多工具调用和流式响应",
      "matchReasons": [
        {
          "type": "keyword",
          "value": "AI Agent",
          "weight": 0.85
        },
        {
          "type": "engagement",
          "value": "2.3K 转发",
          "weight": 0.70
        }
      ]
    }
  ],
  "metadata": {
    "processedCount": 10,
    "signalCount": 3,
    "avgScore": 78,
    "processingTime": "1.2s"
  }
}

错误响应:
{
  "error": "Invalid user profile",
  "code": "INVALID_PROFILE"
}
```

**端点 2: 提取用户兴趣**
```
POST /api/extract-interests

请求体:
{
  "userId": "twitter_handle",
  "likes": Tweet[]  // 用户最近的 Likes
}

响应体:
{
  "interests": [
    {
      "categoryId": "ai_ml",
      "confidence": 0.85,
      "keywords": ["AI", "机器学习", "GPT", "Agent"],
      "sampleTweets": ["1234", "5678"]
    }
  ],
  "recommendedKeywords": ["AI Agent", "Prompt Engineering"]
}
```

**端点 3: 反馈学习**
```
POST /api/feedback

请求体:
{
  "userId": "twitter_handle",
  "signalId": "uuid",
  "feedback": "useful" | "not_interested" | "wrong",
  "correction": {  // 仅当 feedback = "wrong" 时
    "correctCategory": "business_startup"
  }
}

响应体:
{
  "success": true,
  "updatedWeights": {
    "tech_products": 0.85,  // 调整后权重
    "business_startup": 0.60
  }
}
```

### 7.2 AI Prompt 模板

**分析推文的 Prompt:**
```
你是一个专业的 Twitter 内容分析助手。

用户信息:
- 身份: {persona}
- 关注领域: {interests}
- 自定义关键词: {customKeywords}

任务:
分析以下推文，判断它们是否对用户有价值，并生成洞察摘要。

推文列表:
{tweets}

输出格式 (JSON):
{
  "signals": [
    {
      "tweetId": "...",
      "isValuable": true/false,
      "category": "...",  // 从预设分类中选择
      "score": 0-100,     // 综合评分
      "summary": "...",   // 一句话摘要 (20-30字)
      "matchReasons": [
        {
          "type": "keyword",
          "value": "具体关键词",
          "weight": 0.85
        }
      ]
    }
  ]
}

评分标准:
1. 关键词匹配度 (40%)
2. 内容质量 (30%)
3. 互动热度 (20%)
4. 时间新鲜度 (10%)

分类定义:
{categories}

注意事项:
- 只返回 score >= 70 的高价值信号
- 摘要要简洁、有洞察力
- 关键词匹配要准确
- 考虑用户的个性化偏好
```

**提取兴趣的 Prompt:**
```
你是一个用户兴趣分析专家。

任务:
基于用户最近 100 条 Likes，分析用户的兴趣方向。

Likes 数据:
{likes}

输出格式 (JSON):
{
  "interests": [
    {
      "categoryId": "...",
      "confidence": 0.0-1.0,
      "keywords": ["...", "...", "..."],
      "reasoning": "为什么认为用户对这个感兴趣"
    }
  ],
  "recommendedKeywords": ["...", "..."]
}

分析维度:
1. 内容主题频率
2. 互动深度 (是否连续 Like 同一话题)
3. 作者类型 (技术 KOL, 创业者, 创作者)
4. 时间分布 (最近更关注什么)

预设分类:
{categories}

要求:
- 至少识别 3 个兴趣方向
- 按 confidence 降序排列
- 提取 5-10 个高频关键词

8. 技术架构要求
8.1 Chrome Extension 架构
Manifest V3 配置:
json{
  "manifest_version": 3,
  "name": "趋势信号 (TSF)",
  "version": "1.0.0",
  "description": "智能 Twitter 信号检测器",
  
  "permissions": [
    "storage",
    "notifications",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**文件结构:**
```
extension/
├── manifest.json
├── background.js          // Service Worker
├── content.js             // Content Script
├── content.css            // Content Script 样式
├── sidebar/               // 侧边栏 React 应用
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── StatusBar.tsx
│   │   ├── CategoryTabs.tsx
│   │   ├── SignalCard.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useSignals.ts
│   │   ├── useUserProfile.ts
│   │   └── ...
│   └── utils/
│       ├── storage.ts
│       ├── api.ts
│       └── ...
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── dist/                  // Vite 构建输出
8.2 通信架构
消息类型定义:
typescript// Content Script → Background
type ContentToBackgroundMessage =
  | { type: 'ANALYZE_TWEETS', data: Tweet[] }
  | { type: 'GET_USER_PROFILE' }
  | { type: 'OPEN_SIDEBAR' };

// Background → Content Script
type BackgroundToContentMessage =
  | { type: 'SIGNALS_UPDATED', data: Signal[] }
  | { type: 'PROFILE_UPDATED', data: UserProfile }
  | { type: 'BADGE_UPDATED', count: number };

// Sidebar → Background
type SidebarToBackgroundMessage =
  | { type: 'GET_SIGNALS', filter?: string }
  | { type: 'UPDATE_FEEDBACK', signalId: string, feedback: string }
  | { type: 'UPDATE_SETTINGS', settings: Partial<UserProfile> }
  | { type: 'CLEAR_SIGNALS' };
通信示例:
typescript// Content Script 发送推文
chrome.runtime.sendMessage({
  type: 'ANALYZE_TWEETS',
  data: tweets
}, (response) => {
  console.log('Received:', response);
});

// Background 响应
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TWEETS') {
    analyzeTweets(message.data)
      .then(signals => sendResponse({ success: true, signals }))
      .catch(error => sendResponse({ success: false, error }));
    return true; // 异步响应
  }
});
8.3 数据持久化
存储策略:
typescript// chrome.storage.sync (同步到用户账号)
// - 用于用户配置
// - 限制: 100KB
interface SyncStorage {
  userProfile: UserProfile;
  onboardingState: OnboardingState;
}

// chrome.storage.local (仅本地)
// - 用于信号数据
// - 限制: 10MB
interface LocalStorage {
  signals: Signal[];
  tweets: Tweet[];
  cache: {
    lastScanTime: string;
    scannedTweetIds: string[];
  };
}

// 封装存储工具
class StorageManager {
  // 保存用户配置
  async saveProfile(profile: UserProfile) {
    return chrome.storage.sync.set({ userProfile: profile });
  }

  // 获取用户配置
  async getProfile(): Promise<UserProfile | null> {
    const result = await chrome.storage.sync.get(['userProfile']);
    return result.userProfile || null;
  }

  // 保存信号
  async saveSignals(signals: Signal[]) {
    const existing = await this.getSignals();
    const merged = this.mergeSignals(existing, signals);
    return chrome.storage.local.set({ signals: merged });
  }

  // 获取信号
  async getSignals(filter?: string): Promise<Signal[]> {
    const result = await chrome.storage.local.get(['signals']);
    const signals = result.signals || [];
    
    if (filter && filter !== 'all') {
      return signals.filter(s => s.category === filter);
    }
    return signals;
  }

  // 清理旧数据 (保留最近 7 天)
  async cleanupOldSignals() {
    const signals = await this.getSignals();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = signals.filter(s => 
      new Date(s.detectedAt).getTime() > cutoff
    );
    return chrome.storage.local.set({ signals: filtered });
  }

  // 合并去重
  private mergeSignals(existing: Signal[], newSignals: Signal[]): Signal[] {
    const map = new Map(existing.map(s => [s.signalId, s]));
    newSignals.forEach(s => map.set(s.signalId, s));
    return Array.from(map.values());
  }
}
8.4 性能优化
虚拟滚动实现 (如果信号数量 > 50):
typescriptimport { useVirtualizer } from '@tanstack/react-virtual';

function SignalList({ signals }: { signals: Signal[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: signals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 预估卡片高度
    overscan: 5 // 预渲染上下各 5 个
  });

  return (
    <div ref={parentRef} className="signal-list">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`
            }}
          >
            <SignalCard signal={signals[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
懒加载图片:
typescriptfunction LazyImage({ src, alt }: { src: string, alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = imgRef.current;
          if (img) {
            img.src = src;
            img.onload = () => setLoaded(true);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={loaded ? 'loaded' : 'loading'}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
}
```

---

## 9. 开发检查清单

### 9.1 功能完成度
```
□ 首次使用向导 (Onboarding)
  □ 欢迎浮层
  □ 身份选择
  □ 兴趣配置
  □ 自定义关键词
  □ 初始化扫描
  
□ 内容捕获
  □ DOM 监听
  □ 推文提取
  □ 批量发送
  □ 去重逻辑
  
□ 后台分析
  □ API 调用
  □ 评分过滤
  □ 数据存储
  □ 徽章更新
  
□ 侧边栏 UI
  □ 状态栏
  □ 分类标签
  □ 信号卡片
  □ 操作按钮
  
□ 用户交互
  □ 反馈系统
  □ 收藏功能
  □ 分类切换
  □ 设置面板
  
□ 数据持久化
  □ 用户配置
  □ 信号列表
  □ 反馈记录
  □ 数据清理
```

### 9.2 性能检查
```
□ 虚拟滚动 (信号数量 > 50)
□ 懒加载图片
□ Debounce 搜索/设置
□ 批量 API 调用
□ 缓存重复请求
```

### 9.3 兼容性测试
```
□ Chrome (最新版)
□ Edge (最新版)
□ Arc (最新版)
□ Twitter 新/旧版界面

10. 后续迭代方向
P1 (第一优先级)

智能提醒: 定时推送每日摘要通知
团队协作: 分享信号给同事
导出功能: 导出为 Markdown/PDF

P2 (第二优先级)

多平台支持: LinkedIn, Reddit, HackerNews
AI 对话: 与 AI 讨论信号内容
趋势预测: 预测即将爆发的话题