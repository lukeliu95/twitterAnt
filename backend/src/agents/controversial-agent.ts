/**
 * Controversial Agent - 争议议题分析专家
 * 专门识别引发激烈讨论的重要议题
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';
import { CONTROVERSIAL_AGENT_PROMPT, SIGNAL_TYPES } from '../config/signal-rules.js';

export class ControversialAgent extends BaseAgent {
  constructor() {
    super('Controversial', CONTROVERSIAL_AGENT_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: SIGNAL_TYPES.CONTROVERSIAL,
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.relatedTopics || [],
        competition: result.discussionQuality || '',
      };
    } catch (error) {
      console.error('[ControversialAgent] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文是否是值得关注的争议议题：

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
