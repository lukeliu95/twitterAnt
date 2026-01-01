/**
 * Insightful Agent - 深度讨论分析专家
 * 专门发现有洞察力的高质量讨论
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';
import { INSIGHTFUL_AGENT_PROMPT, SIGNAL_TYPES } from '../config/signal-rules.js';

export class InsightfulAgent extends BaseAgent {
  constructor() {
    super('Insightful', INSIGHTFUL_AGENT_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: SIGNAL_TYPES.INSIGHTFUL,
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.relatedTopics || [],
        competition: result.targetAudience || '',
      };
    } catch (error) {
      console.error('[InsightfulAgent] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文是否包含有价值的深度洞察：

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
