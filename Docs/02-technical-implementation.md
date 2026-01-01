# Money Signal 技术实现详解

## 一、Chrome 插件技术实现

### 1.1 Content Script - 推文提取

#### 1.1.1 核心类设计

```typescript
// content/tweet-parser.ts

interface TweetData {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    verified: boolean;
    followerCount: number;
  };
  engagement: {
    replies: number;
    retweets: number;
    likes: number;
    views: number;
  };
  timestamp: string;
  url: string;
  type: 'original' | 'retweet' | 'reply' | 'quote';
  media?: string[];
  links?: string[];
}

class TweetParser {
  private selectors = {
    tweet: 'article[data-testid="tweet"]',
    text: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    userHandle: 'a[role="link"][href*="/"]',
    verified: '[data-testid="icon-verified"]',
    engagement: '[role="group"] [aria-label]',
    media: '[data-testid="tweetPhoto"] img',
    link: 'a[href*="http"]'
  };

  parseTweet(element: Element): TweetData | null {
    try {
      return {
        id: this.extractTweetId(element),
        text: this.extractText(element),
        author: this.extractAuthor(element),
        engagement: this.extractEngagement(element),
        timestamp: this.extractTimestamp(element),
        url: this.extractUrl(element),
        type: this.detectType(element),
        media: this.extractMedia(element),
        links: this.extractLinks(element)
      };
    } catch (error) {
      console.error('Failed to parse tweet:', error);
      return null;
    }
  }

  private extractTweetId(element: Element): string {
    const link = element.querySelector('a[href*="/status/"]');
    const match = link?.getAttribute('href')?.match(/status\/(\d+)/);
    return match?.[1] || '';
  }

  private extractText(element: Element): string {
    const textEl = element.querySelector(this.selectors.text);
    return textEl?.textContent?.trim() || '';
  }

  private extractAuthor(element: Element) {
    const userNameEl = element.querySelector(this.selectors.userName);
    const handleEl = element.querySelector(this.selectors.userHandle);
    const verifiedEl = element.querySelector(this.selectors.verified);

    const displayName = userNameEl?.textContent?.split('\n')[0]?.trim() || '';
    const username = handleEl?.getAttribute('href')?.replace('/', '') || '';
    const verified = !!verifiedEl;

    // 从 Twitter API 或页面解析粉丝数
    const followerCount = this.parseFollowerCount(userNameEl);

    return { username, displayName, verified, followerCount };
  }

  private extractEngagement(element: Element) {
    const engagementEls = element.querySelectorAll(this.selectors.engagement);
    const engagement = { replies: 0, retweets: 0, likes: 0, views: 0 };

    engagementEls.forEach(el => {
      const label = el.getAttribute('aria-label') || '';
      const count = this.parseCount(label);

      if (label.includes('repl')) engagement.replies = count;
      if (label.includes('Retweet')) engagement.retweets = count;
      if (label.includes('like')) engagement.likes = count;
      if (label.includes('view')) engagement.views = count;
    });

    return engagement;
  }

  private parseCount(label: string): number {
    const match = label.match(/[\d,]+/);
    if (!match) return 0;

    const num = match[0].replace(/,/g, '');
    const multiplier = label.includes('K') ? 1000 :
                       label.includes('M') ? 1000000 : 1;
    return parseInt(num) * multiplier;
  }

  private detectType(element: Element): TweetData['type'] {
    const text = element.textContent || '';

    if (text.includes('Retweeted')) return 'retweet';
    if (text.includes('Replying to')) return 'reply';
    if (element.querySelector('[data-testid="tweet"] [data-testid="tweet"]')) {
      return 'quote';
    }
    return 'original';
  }

  private extractMedia(element: Element): string[] {
    const mediaEls = element.querySelectorAll(this.selectors.media);
    return Array.from(mediaEls).map(el => el.getAttribute('src') || '');
  }

  private extractLinks(element: Element): string[] {
    const linkEls = element.querySelectorAll(this.selectors.link);
    return Array.from(linkEls)
      .map(el => el.getAttribute('href'))
      .filter(Boolean) as string[];
  }
}
```

#### 1.1.2 DOM 监听器

```typescript
// content/dom-observer.ts

class DOMObserver {
  private processedTweets = new Set<string>();
  private observer: MutationObserver | null = null;
  private scanThrottleTimer: number | null = null;
  private readonly SCAN_THROTTLE = 500; // ms

  constructor(
    private onTweetFound: (tweet: TweetData) => void,
    private parser: TweetParser
  ) {}

  start() {
    if (this.observer) return;

    const timeline = this.findTimelineContainer();
    if (!timeline) {
      console.error('Timeline container not found');
      return;
    }

    this.observer = new MutationObserver(() => {
      this.throttledScan();
    });

    this.observer.observe(timeline, {
      childList: true,
      subtree: true
    });

    // 初始扫描
    this.scanTweets();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
  }

  private findTimelineContainer(): Element | null {
    // Twitter/X 的 DOM 结构
    const selectors = [
      'main[role="main"] div[data-testid="primaryColumn"]',
      'div[data-testid="primaryColumn"]',
      'main[role="main"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  private throttledScan() {
    if (this.scanThrottleTimer) return;

    this.scanThrottleTimer = window.setTimeout(() => {
      this.scanTweets();
      this.scanThrottleTimer = null;
    }, this.SCAN_THROTTLE);
  }

  private scanTweets() {
    const tweetElements = document.querySelectorAll(this.selectors.tweet);

    tweetElements.forEach(element => {
      const tweet = this.parser.parseTweet(element);

      if (tweet && !this.processedTweets.has(tweet.id)) {
        this.processedTweets.add(tweet.id);
        this.onTweetFound(tweet);
      }
    });

    // 清理过期的 ID（防止内存泄漏）
    if (this.processedTweets.size > 1000) {
      const idsArray = Array.from(this.processedTweets);
      this.processedTweets = new Set(idsArray.slice(-500));
    }
  }
}
```

#### 1.1.3 本地初筛器

```typescript
// content/pre-filter.ts

interface SignalKeyword {
  demand: string[];
  revenue: string[];
  help: string[];
  willPay: string[];
}

class PreFilter {
  private keywords: SignalKeyword = {
    demand: [
      // 中文
      '有没有', '求推荐', '需要', '在找', '有人知道',
      // 英文
      'looking for', 'anyone know', 'recommend', 'need', 'searching for',
      // 日文
      '探している', '誰か知っている', 'おすすめ', '必要'
    ],
    revenue: [
      // 中文
      '月收入', '副业', '赚了', '营收', '收入',
      // 英文
      'mrr', 'arr', 'revenue', 'income', 'made $', 'earning',
      // 日文
      '売上', '収益', '稼', '月収'
    ],
    help: [
      // 中文
      '求助', '怎么做', '怎么弄', '有人会',
      // 英文
      'help', 'how to', 'how do i', 'anyone can',
      // 日文
      '助けて', 'どうやって', '方法'
    ],
    willPay: [
      // 中文
      '愿意付', '付费', '预算', '找外包',
      // 英文
      'will pay', 'paying for', 'budget', 'hiring',
      // 日文
      '有料', '払う', '依頼'
    ]
  };

  filter(tweet: TweetData): boolean {
    // 1. 过滤转推
    if (tweet.type === 'retweet') return false;

    // 2. 过滤短推文
    if (tweet.text.length < 30) return false;

    // 3. 关键词匹配
    const text = tweet.text.toLowerCase();
    for (const category in this.keywords) {
      if (this.matchKeywords(text, this.keywords[category as keyof SignalKeyword])) {
        return true;
      }
    }

    // 4. 高互动推文（可能是重要信息）
    if (this.isHighEngagement(tweet)) return true;

    // 5. 大 V 推文（可能包含有价值的观点）
    if (tweet.author.followerCount > 50000) return true;

    return false;
  }

  private matchKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  private isHighEngagement(tweet: TweetData): boolean {
    const { likes, retweets } = tweet.engagement;
    return likes > 100 || retweets > 50;
  }
}
```

### 1.2 Background Service Worker

#### 1.2.1 推文队列管理

```typescript
// background/tweet-queue.ts

interface QueuedTweet {
  data: TweetData;
  timestamp: number;
  retryCount: number;
}

class TweetQueue {
  private queue: QueuedTweet[] = [];
  private processing = false;
  private flushTimer: number | null = null;

  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30s
  private readonly MAX_RETRY = 3;

  constructor(private backendAPI: BackendAPI) {}

  add(tweet: TweetData) {
    this.queue.push({
      data: tweet,
      timestamp: Date.now(),
      retryCount: 0
    });

    // 达到批次大小，立即发送
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;

    this.flushTimer = window.setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, this.FLUSH_INTERVAL);
  }

  private async flush() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    const tweets = batch.map(item => item.data);

    try {
      await this.backendAPI.sendTweets(tweets);
      console.log(`Sent ${tweets.length} tweets to backend`);
    } catch (error) {
      console.error('Failed to send tweets:', error);

      // 重试逻辑
      batch.forEach(item => {
        if (item.retryCount < this.MAX_RETRY) {
          item.retryCount++;
          this.queue.push(item);
        }
      });
    } finally {
      this.processing = false;

      // 如果还有待处理的，继续发送
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }

  // Service Worker 即将休眠时强制发送
  forceFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}
```

#### 1.2.2 后端 API 通信

```typescript
// background/backend-api.ts

class BackendAPI {
  private readonly API_BASE_URL = 'https://api.money-signal.com';

  async sendTweets(tweets: TweetData[]): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/api/tweets/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify({ tweets })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  }

  async getSignals(userId?: string): Promise<Signal[]> {
    const response = await fetch(
      `${this.API_BASE_URL}/api/signals${userId ? `?user=${userId}` : ''}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async sendFeedback(feedback: UserFeedback): Promise<void> {
    await fetch(`${this.API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
  }

  private async getAuthToken(): Promise<string> {
    // 从 storage 获取或生成匿名 token
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        resolve(result.authToken || this.generateAnonymousToken());
      });
    });
  }

  private generateAnonymousToken(): string {
    return `anon_${crypto.randomUUID()}`;
  }
}
```

#### 1.2.3 消息通信

```typescript
// background/service-worker.ts

class MessageRouter {
  constructor(
    private tweetQueue: TweetQueue,
    private backendAPI: BackendAPI
  ) {}

  setup() {
    // 监听来自 content script 的推文
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'NEW_TWEET':
          this.tweetQueue.add(message.tweet);
          break;

        case 'GET_SIGNALS':
          this.backendAPI.getSignals()
            .then(signals => sendResponse({ signals }))
            .catch(error => sendResponse({ error: error.message }));
          return true; // 异步响应

        case 'SEND_FEEDBACK':
          this.backendAPI.sendFeedback(message.feedback)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ error: error.message }));
          return true;
      }
    });

    // 监听插件安装/更新
    chrome.runtime.onInstalled.addListener(() => {
      this.setupDefaultConfig();
    });

    // 监听 Service Worker 休眠前的事件
    chrome.runtime.onSuspend.addListener(() => {
      this.tweetQueue.forceFlush();
    });

    // 监听侧边栏打开
    chrome.sidePanel.onPanelOpened.addListener(() => {
      this.refreshSignals();
    });
  }

  private setupDefaultConfig() {
    chrome.storage.local.set({
      config: {
        enabled: true,
        signalTypes: ['demand', 'revenue', 'skill', 'trend'],
        language: 'auto'
      }
    });
  }

  private async refreshSignals() {
    // 刷新信号数据
    const signals = await this.backendAPI.getSignals();
    chrome.storage.session.set({ currentSignals: signals });
  }
}
```

### 1.3 Side Panel UI

#### 1.3.1 信号卡片组件

```tsx
// sidepanel/components/SignalCard.tsx

interface SignalCardProps {
  signal: Signal;
  onSave: () => void;
  onActed: () => void;
  onIgnore: () => void;
}

export function SignalCard({ signal, onSave, onActed, onIgnore }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.signalCard}>
      {/* 信号类型标签 */}
      <div className={styles.header}>
        <SignalTypeBadge type={signal.type} />
        <SignalScore score={signal.score} />
      </div>

      {/* 一句话摘要 */}
      <p className={styles.summary}>{signal.summary}</p>

      {/* 原始推文 */}
      <div className={styles.tweet}>
        <TweetPreview tweet={signal.originalTweet} />
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className={styles.details}>
          {/* 这是什么机会 */}
          <section className={styles.section}>
            <h4>📍 这是什么机会</h4>
            <p>{signal.description}</p>
          </section>

          {/* 为什么推给你 */}
          <section className={styles.section}>
            <h4>🎯 为什么推给你</h4>
            <p>{signal.reason}</p>
            {signal.matchedSkills && (
              <SkillMatch skills={signal.matchedSkills} />
            )}
          </section>

          {/* 建议行动 */}
          <section className={styles.section}>
            <h4>⚡ 建议你现在做</h4>
            <ActionPlan plan={signal.actionPlan} />
          </section>

          {/* 竞品分析 */}
          {signal.competition && (
            <section className={styles.section}>
              <h4>📊 竞品情况</h4>
              <CompetitionInfo data={signal.competition} />
            </section>
          )}
        </div>
      )}

      {/* 展开/收起按钮 */}
      <button
        className={styles.expandButton}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '收起' : '查看详情 ▼'}
      </button>

      {/* 操作按钮 */}
      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={onSave}>
          🔖 保存
        </button>
        <button className={styles.actedBtn} onClick={onActed}>
          ✓ 已行动
        </button>
        <button className={styles.ignoreBtn} onClick={onIgnore}>
          ✗ 不感兴趣
        </button>
      </div>
    </div>
  );
}
```

#### 1.3.2 状态管理

```typescript
// sidepanel/store/signalStore.ts

interface SignalStore {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  filter: SignalFilter;

  fetchSignals: () => Promise<void>;
  saveSignal: (id: string) => Promise<void>;
  markAsActed: (id: string) => Promise<void>;
  ignoreSignal: (id: string) => Promise<void>;
  setFilter: (filter: SignalFilter) => void;
}

export const useSignalStore = create<SignalStore>((set, get) => ({
  signals: [],
  loading: false,
  error: null,
  filter: {
    types: ['demand', 'revenue', 'skill', 'trend'],
    minScore: 3
  },

  fetchSignals: async () => {
    set({ loading: true, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SIGNALS'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ signals: response.signals, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  saveSignal: async (id: string) => {
    await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      feedback: { signalId: id, action: 'save' }
    });

    set(state => ({
      signals: state.signals.map(s =>
        s.id === id ? { ...s, saved: true } : s
      )
    }));
  },

  markAsActed: async (id: string) => {
    await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      feedback: { signalId: id, action: 'acted' }
    });

    set(state => ({
      signals: state.signals.map(s =>
        s.id === id ? { ...s, acted: true } : s
      )
    }));
  },

  ignoreSignal: async (id: string) => {
    await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      feedback: { signalId: id, action: 'ignore' }
    });

    set(state => ({
      signals: state.signals.filter(s => s.id !== id)
    }));
  },

  setFilter: (filter: SignalFilter) => {
    set({ filter });
  }
}));
```

---

## 二、后端技术实现

### 2.1 Agent 系统架构

#### 2.1.1 主控 Agent (Orchestrator)

```typescript
// agents/orchestrator.ts

import { Agent, AgentError } from '@anthropic-ai/claude-agent-sdk';

interface AnalysisResult {
  signalType: string;
  score: number;
  summary: string;
  description: string;
  reason: string;
  actionPlan: string[];
  competition?: string;
}

class OrchestratorAgent {
  private agents: Map<string, Agent>;

  constructor(
    private claudeService: ClaudeService,
    private vectorDB: VectorDB,
    private userProfile: UserProfileService
  ) {
    this.agents = new Map([
      ['demand', new DemandGapAgent(claudeService)],
      ['revenue', new RevenueProofAgent(claudeService)],
      ['skill', new SkillMatchAgent(claudeService, userProfile)],
      ['trend', new TrendAgent(claudeService, vectorDB)]
    ]);
  }

  async analyzeTweet(tweet: TweetData): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // 并行调用所有 Agent
    const agentPromises = Array.from(this.agents.entries()).map(
      async ([type, agent]) => {
        try {
          const result = await agent.analyze(tweet);
          return { type, result };
        } catch (error) {
          if (error instanceof AgentError) {
            console.warn(`${type} agent failed:`, error.message);
          }
          return null;
        }
      }
    );

    const agentResults = await Promise.all(agentPromises);

    // 过滤有效结果
    for (const item of agentResults) {
      if (item && item.result.score >= 3) {
        results.push({
          signalType: item.type,
          ...item.result
        });
      }
    }

    // 如果有多个信号，进行去重和合并
    return this.mergeResults(results);
  }

  private mergeResults(results: AnalysisResult[]): AnalysisResult[] {
    // 简单实现：选择分数最高的
    // 实际可以更复杂，比如合并相关信号
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // 最多返回 3 个信号
  }

  async analyzeBatch(tweets: TweetData[]): Promise<Signal[]> {
    const signals: Signal[] = [];

    // 批量分析，使用任务队列控制并发
    const queue = new PQueue({ concurrency: 5 });

    const tasks = tweets.map(tweet =>
      queue.add(async () => {
        const results = await this.analyzeTweet(tweet);
        return results.map(r => this.createSignal(tweet, r));
      })
    );

    const batches = await Promise.all(tasks);

    for (const batch of batches) {
      signals.push(...batch);
    }

    return signals;
  }

  private createSignal(tweet: TweetData, result: AnalysisResult): Signal {
    return {
      id: crypto.randomUUID(),
      tweetId: tweet.id,
      type: result.signalType,
      score: result.score,
      summary: result.summary,
      description: result.description,
      reason: result.reason,
      actionPlan: result.actionPlan,
      competition: result.competition,
      originalTweet: tweet,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天
    };
  }
}
```

#### 2.1.2 需求缺口 Agent

```typescript
// agents/agents/demand-gap-agent.ts

import { Agent } from '@anthropic-ai/claude-agent-sdk';
import { demandAnalysisPrompt } from '../prompts/demand-analysis';

class DemandGapAgent extends Agent {
  constructor(claudeService: ClaudeService) {
    super({
      name: 'DemandGapAnalyzer',
      instructions: `你是一个需求缺口分析专家。
你的任务是从推文中识别出未被满足的需求。

识别标准：
1. 明确的需求表达：「有没有人知道...」、「求推荐...」
2. 隐性的需求表达：「为什么没有人做...」、「我愿意付费买...」
3. 痛点表达：「很麻烦...」、「总是要...」`
    });
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult> {
    // 使用 Tool Use 调用搜索工具
    const similarOpportunities = await this.tool('search_similar_opportunities', {
      query: tweet.text,
      count: 5
    });

    // 构建 Prompt
    const prompt = demandAnalysisPrompt({
      tweet,
      similarOpportunities
    });

    // 调用 Claude
    const response = await this.claudeService.chat(prompt);

    // 解析响应
    return this.parseAnalysis(response, tweet);
  }

  private parseAnalysis(response: string, tweet: TweetData): AnalysisResult {
    // 解析 Claude 返回的结构化数据
    // 实际应该使用 JSON Mode 或 Tool Use 返回结构化数据
    return {
      signalType: 'demand',
      score: this.calculateScore(response, tweet),
      summary: this.extractSummary(response),
      description: this.extractDescription(response),
      reason: this.extractReason(response),
      actionPlan: this.extractActionPlan(response),
      competition: this.extractCompetition(response)
    };
  }

  private calculateScore(response: string, tweet: TweetData): number {
    let score = 0;

    // 基础分
    score += 2;

    // 有明确需求表达 +2
    if (/求|找|需要|looking for|need/i.test(tweet.text)) {
      score += 2;
    }

    // 有付费意愿 +2
    if (/付|pay|预算|budget/i.test(tweet.text)) {
      score += 2;
    }

    // 高互动 +1
    if (tweet.engagement.likes > 50) {
      score += 1;
    }

    // 相似机会少 +2
    if (response.includes('no competition') || response.includes('low competition')) {
      score += 2;
    }

    return Math.min(score, 5); // 最高 5 分
  }
}
```

#### 2.1.3 Prompt 模板

```typescript
// agents/prompts/demand-analysis.ts

interface DemandAnalysisInput {
  tweet: TweetData;
  similarOpportunities: SimilarOpportunity[];
}

export function demandAnalysisPrompt(input: DemandAnalysisInput): string {
  return `分析以下推文是否包含需求缺口信号。

## 推文信息

**作者：** ${input.tweet.author.displayName} (@${input.tweet.author.username})
**粉丝数：** ${input.tweet.author.followerCount}
**发布时间：** ${input.tweet.timestamp}
**互动数据：** ${input.tweet.engagement.likes} 赞, ${input.tweet.engagement.replies} 回复

**推文内容：**
"""
${input.tweet.text}
"""

## 相似历史机会

${input.similarOpportunities.length > 0 ?
  input.similarOpportunities.map((opp, i) => `
**机会 ${i + 1}:**
- 类型: ${opp.type}
- 描述: ${opp.description}
- 时间: ${opp.time}
- 效果: ${opp.outcome}
`).join('\n') :
  '未找到相似的历史机会。'
}

## 分析要求

请以 JSON 格式返回分析结果：

\`\`\`json
{
  "isSignal": boolean,
  "score": number (1-5),
  "summary": "一句话摘要",
  "description": "详细描述这是什么需求缺口",
  "reason": "为什么这是机会",
  "actionPlan": ["具体建议1", "具体建议2", "具体建议3"],
  "competition": "竞争情况分析",
  "targetMarket": "目标市场描述",
  "estimatedDifficulty": "实现难度 (easy/medium/hard)",
  "monetization": "可能的变现方式"
}
\`\`\`

注意：
- score 必须 >= 3 才算有效信号
- actionPlan 必须具体可执行
- competition 分析要基于相似机会的数量和成功率
`;
}
```

### 2.2 Tool Functions

#### 2.2.1 向量检索工具

```typescript
// agents/tools/search-similar.ts

interface SimilarOpportunity {
  id: string;
  type: string;
  description: string;
  time: string;
  outcome?: string;
}

class SearchSimilarOpportunitiesTool {
  constructor(
    private vectorDB: VectorDB,
    private claudeService: ClaudeService
  ) {}

  async execute(params: { query: string; count: number }): Promise<SimilarOpportunity[]> {
    // 1. 生成查询向量
    const embedding = await this.claudeService.getEmbedding(params.query);

    // 2. 向量检索
    const results = await this.vectorDB.search({
      vector: embedding,
      topK: params.count * 2, // 多取一些，后续筛选
      filter: {
        type: { $in: ['demand', 'revenue', 'skill'] }
      }
    });

    // 3. 去重和排序
    const opportunities = await this.enrichResults(results);

    return opportunities.slice(0, params.count);
  }

  private async enrichResults(results: VectorSearchResult[]): Promise<SimilarOpportunity[]> {
    // 从数据库获取完整信息
    const signalIds = results.map(r => r.id);
    const signals = await SignalModel.findAll({ id: { $in: signalIds } });

    return signals.map(signal => ({
      id: signal.id,
      type: signal.type,
      description: signal.description,
      time: this.formatTime(signal.createdAt),
      outcome: signal.outcome
    }));
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 周前`;
    return `${Math.floor(days / 30)} 月前`;
  }
}
```

#### 2.2.2 用户画像工具

```typescript
// agents/tools/get-profile.ts

interface UserProfile {
  userId: string;
  skills: string[];
  interests: string[];
  experience: {
    domain: string;
    level: 'beginner' | 'intermediate' | 'expert';
  }[];
  preferences: {
    signalTypes: string[];
    languages: string[];
    riskTolerance: 'low' | 'medium' | 'high';
  };
  history: {
    savedSignals: number;
    actedSignals: number;
    ignoredSignals: number;
  };
}

class GetUserProfileTool {
  async execute(params: { userId: string }): Promise<UserProfile> {
    let profile = await UserProfileModel.findByUserId(params.userId);

    if (!profile) {
      // 首次使用，创建默认画像
      profile = await this.createDefaultProfile(params.userId);
    }

    return profile;
  }

  private async createDefaultProfile(userId: string): Promise<UserProfile> {
    return {
      userId,
      skills: [], // 需要通过问卷收集
      interests: [],
      experience: [],
      preferences: {
        signalTypes: ['demand', 'revenue', 'skill', 'trend'],
        languages: ['en', 'zh'],
        riskTolerance: 'medium'
      },
      history: {
        savedSignals: 0,
        actedSignals: 0,
        ignoredSignals: 0
      }
    };
  }

  // 根据用户行为更新画像
  async updateFromFeedback(userId: string, feedback: UserFeedback) {
    const profile = await this.execute({ userId });

    // 更新历史统计
    profile.history[`${feedback.action}Signals`]++;
    await UserProfileModel.update(userId, profile);

    // 如果反馈数据足够，用 ML 模型更新兴趣
    if (profile.history.actedSignals >= 10) {
      await this.updateInterests(userId);
    }
  }

  private async updateInterests(userId: string) {
    // 使用用户的行为数据训练/更新推荐模型
    // 可以用简单的协同过滤或更复杂的 ML 模型
  }
}
```

### 2.3 API 路由

#### 2.3.1 推文接收 API

```typescript
// api/routes/tweets.ts

import { z } from 'zod';

const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.object({
    username: z.string(),
    displayName: z.string(),
    followerCount: z.number()
  }),
  engagement: z.object({
    likes: z.number(),
    retweets: z.number(),
    replies: z.number()
  }),
  timestamp: z.string(),
  type: z.enum(['original', 'retweet', 'reply', 'quote'])
});

const BatchTweetsSchema = z.object({
  tweets: z.array(TweetSchema).min(1).max(50)
});

export async function tweetsRoutes(fastify: FastifyInstance) {
  // 接收批量推文
  fastify.post('/api/tweets/batch', {
    preHandler: [rateLimiter(), authOptional()],
    schema: {
      body: BatchTweetsSchema
    }
  }, async (request, reply) => {
    const { tweets } = request.body as { tweets: TweetData[] };

    // 添加到处理队列
    const jobId = await tweetQueue.add('analyze', { tweets });

    return {
      success: true,
      jobId,
      message: 'Tweets queued for analysis'
    };
  });

  // 获取处理状态
  fastify.get('/api/tweets/status/:jobId', {
    preHandler: [authRequired()]
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    const job = await tweetQueue.getJob(jobId);

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress
    };
  });
}
```

#### 2.3.2 信号获取 API

```typescript
// api/routes/signals.ts

export async function signalsRoutes(fastify: FastifyInstance) {
  // 获取用户的信号列表
  fastify.get('/api/signals', {
    preHandler: [rateLimiter(), authOptional()]
  }, async (request, reply) => {
    const { userId, type, minScore, limit } = request.query as {
      userId?: string;
      type?: string;
      minScore?: string;
      limit?: string;
    };

    // 构建查询
    const query: any = {
      active: true,
      expiresAt: { $gt: new Date() }
    };

    if (type) {
      query.type = type;
    }

    if (minScore) {
      query.score = { $gte: parseInt(minScore) };
    }

    // 如果有用户 ID，获取个性化推荐
    let signals;
    if (userId) {
      const profile = await getUserProfile(userId);
      signals = await getPersonalizedSignals(query, profile);
    } else {
      signals = await SignalModel.find(query)
        .sort({ score: -1, createdAt: -1 })
        .limit(parseInt(limit) || 20);
    }

    return {
      signals,
      total: signals.length
    };
  });

  // 获取单个信号详情
  fastify.get('/api/signals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const signal = await SignalModel.findById(id);

    if (!signal) {
      return reply.code(404).send({ error: 'Signal not found' });
    }

    return signal;
  });
}

async function getPersonalizedSignals(query: any, profile: UserProfile): Promise<Signal[]> {
  // 1. 基础查询
  let signals = await SignalModel.find(query);

  // 2. 根据用户技能过滤/排序
  if (profile.skills.length > 0) {
    signals = signals.filter(signal => {
      // 检查信号是否匹配用户技能
      return signal.matchedSkills?.some(skill =>
        profile.skills.includes(skill)
      );
    });
  }

  // 3. 根据历史反馈调整排序
  signals = signals.sort((a, b) => {
    const scoreA = calculatePersonalizedScore(a, profile);
    const scoreB = calculatePersonalizedScore(b, profile);
    return scoreB - scoreA;
  });

  return signals.slice(0, 50);
}
```

---

## 三、部署方案

### 3.1 Chrome 插件发布

```bash
# 1. 构建生产版本
cd extension
pnpm build

# 2. 打包
zip -r money-signal-extension.zip dist/

# 3. 上传到 Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/devconsole
```

### 3.2 后端部署

使用 Cloudflare Workers 部署：

```typescript
// wrangler.toml

name = "money-signal-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "api.money-signal.com/*", zone_name = "money-signal.com" }
]

[[env.production.vars]]
ENVIRONMENT = "production"
DATABASE_URL = "${DATABASE_URL}"
REDIS_URL = "${REDIS_URL}"
ANTHROPIC_API_KEY = "${ANTHROPIC_API_KEY}"
```

```bash
# 部署到 Cloudflare Workers
pnpm deploy
```

---

*文档版本：v1.0*
*最后更新：2026年1月1日*
