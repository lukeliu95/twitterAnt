/**
 * Topic Agent
 * 通用议题分析 Agent，用于处理所有 7 大议题
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData, SignalType } from '../types/index.js';

export class TopicAgent extends BaseAgent {
  constructor(
    name: string,
    systemPrompt: string,
    private readonly topicType: SignalType
  ) {
    super(name, systemPrompt);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: this.topicType,
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.matchedSkills || [], // 可选字段
        competition: result.competition || '',     // 可选字段
      };
    } catch (error) {
      console.error(`[${this.name}] Analysis failed:`, error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文：

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
