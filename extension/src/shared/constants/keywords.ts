/**
 * 信号检测关键词库（多语言）
 */

export interface SignalKeywords {
  demand: string[];
  revenue: string[];
  help: string[];
  willPay: string[];
}

export const SIGNAL_KEYWORDS: SignalKeywords = {
  demand: [
    // 中文
    '有没有',
    '求推荐',
    '需要',
    '在找',
    '有人知道',
    '谁有',
    '求助',
    // 英文
    'looking for',
    'anyone know',
    'recommend',
    'need',
    'searching for',
    'does anyone',
    'looking for recommendations',
    // 日文
    '探している',
    '誰か知っている',
    'おすすめ',
    '必要',
  ],
  revenue: [
    // 中文
    '月收入',
    '副业',
    '赚了',
    '营收',
    '收入',
    '变现',
    '盈利',
    // 英文
    'mrr',
    'arr',
    'revenue',
    'income',
    'made $',
    'earning',
    'profit',
    'monetize',
    // 日文
    '売上',
    '収益',
    '稼',
    '月収',
    'もうけ',
  ],
  help: [
    // 中文
    '求助',
    '怎么做',
    '怎么弄',
    '有人会',
    '如何',
    '怎么',
    // 英文
    'help',
    'how to',
    'how do i',
    'anyone can',
    'need help with',
    // 日文
    '助けて',
    'どうやって',
    '方法',
  ],
  willPay: [
    // 中文
    '愿意付',
    '付费',
    '预算',
    '找外包',
    '有偿',
    // 英文
    'will pay',
    'paying for',
    'budget',
    'hiring',
    'paid gig',
    // 日文
    '有料',
    '払う',
    '依頼',
    'お金を出しても',
  ],
};

/**
 * 推文类型检测关键词
 */
export const RETWEET_KEYWORDS = ['Retweeted', '转推'];
export const REPLY_KEYWORDS = ['Replying to', '回复'];
