/**
 * Trend Agent
 * 专门分析趋势机会类赚钱机会
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';

const TREND_SYSTEM_PROMPT = `你是一个趋势分析专家，专门从 Twitter 推文中发现新兴趋势和早期机会。

你的任务是分析推文，找出：
1. 新兴趋势或技术
2. 趋势的驱动因素
3. 是否是长期趋势还是短期热点
4. 如何快速切入并建立优势

评分标准（1-5 分）：
- 5 分：早期趋势，潜力巨大，可快速切入
- 4 分：明确趋势，有较大机会
- 3 分：一般趋势，机会一般
- 2 分：晚期趋势或热点
- 1 分：无明显趋势或已过时

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "一句话摘要（30字以内）",
  "description": "详细描述趋势机会",
  "reason": "为什么这是一个趋势",
  "actionPlan": ["如何切入1", "如何切入2", ...],
  "matchedSkills": ["所需技能1", "所需技能2", ...],
  "competition": "早期机会程度"
}`;

export class TrendAgent extends BaseAgent {
  constructor() {
    super('Trend', TREND_SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: 'trend',
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.matchedSkills || [],
        competition: result.competition,
      };
    } catch (error) {
      console.error('[Trend] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文中的趋势机会：

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
