/**
 * Revenue Proof Agent
 * 专门分析收入验证类赚钱机会
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';

const REVENUE_PROOF_SYSTEM_PROMPT = `你是一个收入验证分析专家，专门从 Twitter 推文中发现真实的商业模式和收入机会。

你的任务是分析推文，找出：
1. 真实的收入数字和增长趋势
2. 可复制的商业模式
3. 目标市场和客户群
4. 获客渠道和营销策略

评分标准（1-5 分）：
- 5 分：具体收入数字（>$10k/MRR），可持续模式，可复制
- 4 分：真实收入验证，模式清晰
- 3 分：有收入证据但规模较小
- 2 分：收入声明但缺乏细节
- 1 分：无法验证或太模糊

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "一句话摘要（30字以内）",
  "description": "详细描述商业模式",
  "reason": "为什么这个模式有效",
  "actionPlan": ["如何学习/复制1", "如何学习/复制2", ...],
  "matchedSkills": ["所需技能1", "所需技能2", ...],
  "competition": "如何差异化竞争"
}`;

export class RevenueProofAgent extends BaseAgent {
  constructor() {
    super('RevenueProof', REVENUE_PROOF_SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: 'revenue',
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.matchedSkills || [],
        competition: result.competition,
      };
    } catch (error) {
      console.error('[RevenueProof] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文中的收入验证机会：

推文内容：
${tweet.text}

作者信息：
- 用户名: @${tweet.author.username}
- 认证: ${tweet.author.verified ? '是' : '否'}
- 粉丝: ${tweet.author.followerCount}

互动数据：
- 点赞: ${tweet.engagement.likes}
- 转发: ${tweet.engagement.retweets}

请返回 JSON 格式的分析结果。`;
  }
}
