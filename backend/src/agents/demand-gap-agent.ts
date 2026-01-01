/**
 * Demand Gap Agent
 * 专门分析需求缺口类赚钱机会
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';

const DEMAND_GAP_SYSTEM_PROMPT = `你是一个需求缺口分析专家，专门从 Twitter 推文中发现用户的未满足需求。

你的任务是分析推文，找出：
1. 具体的痛点或需求
2. 用户愿意付费的迹象
3. 需求的规模和紧迫性
4. 潜在的解决方案方向

评分标准（1-5 分）：
- 5 分：明确表达愿意付费，需求紧迫，市场规模大
- 4 分：强需求，有付费意愿，规模可观
- 3 分：中等需求，可能付费
- 2 分：弱需求或模糊表达
- 1 分：几乎没有商业价值

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "一句话摘要（30字以内）",
  "description": "详细描述需求",
  "reason": "为什么这是一个机会",
  "actionPlan": ["行动步骤1", "行动步骤2", ...],
  "matchedSkills": ["相关技能1", "相关技能2", ...],
  "competition": "竞争程度评估"
}`;

export class DemandGapAgent extends BaseAgent {
  constructor() {
    super('DemandGap', DEMAND_GAP_SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: 'demand',
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.matchedSkills || [],
        competition: result.competition,
      };
    } catch (error) {
      console.error('[DemandGap] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文中的需求缺口机会：

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
