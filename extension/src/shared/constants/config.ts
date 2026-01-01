/**
 * 插件配置常量
 */

export const CONFIG = {
  /** 后端 API 地址 */
  API_BASE_URL: 'http://localhost:3001',

  /** 推文批次配置 */
  TWEET_BATCH: {
    /** 批次大小 */
    SIZE: 3,  // 降低以便更快看到结果
    /** 批次间隔 (ms) */
    INTERVAL: 5000,  // 从 30 秒降到 5 秒
    /** 最大缓存数量 */
    MAX_CACHE_SIZE: 1000,
  },

  /** DOM 选择器 */
  SELECTORS: {
    /** 推文容器 */
    TWEET: 'article[data-testid="tweet"]',
    /** 推文文本 */
    TWEET_TEXT: '[data-testid="tweetText"]',
    /** 用户名 */
    USER_NAME: '[data-testid="User-Name"]',
    /** 用户链接 */
    USER_LINK: 'a[role="link"][href*="/"]',
    /** 认证标识 */
    VERIFIED: '[data-testid="icon-verified"]',
    /** 互动数据 */
    ENGAGEMENT: '[role="group"] [aria-label]',
    /** 媒体 */
    MEDIA: '[data-testid="tweetPhoto"] img',
    /** 链接 */
    LINK: 'a[href*="http"]',
    /** 主时间线容器 */
    TIMELINE: 'main[role="main"] div[data-testid="primaryColumn"]',
  },

  /** 信号评分阈值 */
  SIGNAL_THRESHOLD: {
    /** 最低有效分数 */
    MIN_SCORE: 3,
    /** 推送分数 */
    PUSH_SCORE: 4,
  },

  /** 缓存 TTL (ms) */
  CACHE_TTL: {
    /** 推文缓存 */
    TWEET: 24 * 60 * 60 * 1000,
    /** 信号缓存 */
    SIGNAL: 5 * 60 * 1000,
  },

  /** 重试配置 */
  RETRY: {
    /** 最大重试次数 */
    MAX_ATTEMPTS: 3,
    /** 重试延迟 (ms) */
    DELAY: 5000,
  },
} as const;
