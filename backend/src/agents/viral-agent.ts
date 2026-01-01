/**
 * Viral Agent - 爆发话题分析专家
 * 专门识别正在快速传播的热门内容
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';
import { VIRAL_AGENT_PROMPT, SIGNAL_TYPES } from '../config/signal-rules.js';

export class ViralAgent extends BaseAgent {
  constructor() {
    super('Viral', VIRAL_AGENT_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: SIGNAL_TYPES.VIRAL,
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.relatedTopics || [],
        competition: result.discussionVelocity || '',
      };
    } catch (error) {
      console.error('[ViralAgent] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文是否是一个爆发话题：

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
- 浏览: ${tweet.engagement.views || 'N/A'}

请返回 JSON 格式的分析结果。`;
  }
}
