/**
 * Industry News Agent - 行业动态分析专家
 * 专门识别重要的行业新闻和趋势
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';
import { INDUSTRY_NEWS_AGENT_PROMPT, SIGNAL_TYPES } from '../config/signal-rules.js';

export class IndustryNewsAgent extends BaseAgent {
  constructor() {
    super('IndustryNews', INDUSTRY_NEWS_AGENT_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: SIGNAL_TYPES.INDUSTRY_NEWS,
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.relatedTopics || [],
        competition: result.impactScope || '',
      };
    } catch (error) {
      console.error('[IndustryNewsAgent] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文是否是重要的行业动态：

推文内容：
${tweet.text}

作者信息：
- 用户名: @${tweet.author.username}
- 认证: ${tweet.author.verified ? '是' : '否'}
- 粉丝: ${tweet.author.followerCount}

互动数据：
- 点赞: ${tweet.engagement.likes}
- 转发: ${tweet.engagement.retweets}
- 回复: ${tweet.engagement.replies}

请返回 JSON 格式的分析结果。`;
  }
}
