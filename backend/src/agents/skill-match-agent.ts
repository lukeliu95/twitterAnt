/**
 * Skill Match Agent
 * 专门分析技能需求类赚钱机会
 */

import { BaseAgent, type AnalysisResult } from './base-agent.js';
import type { TweetData } from '../types/index.js';

const SKILL_MATCH_SYSTEM_PROMPT = `你是一个技能需求分析专家，专门从 Twitter 推文中发现市场对特定技能的需求。

你的任务是分析推文，找出：
1. 需要的具体技能和工具
2. 技能的稀缺性和价值
3. 学习该技能的成本和时间
4. 如何通过该技能变现

评分标准（1-5 分）：
- 5 分：高价值技能，需求旺盛，稀缺性强
- 4 分：有价值技能，市场需求明确
- 3 分：一般技能，有一定需求
- 2 分：常见技能，竞争激烈
- 1 分：低价值或过于小众

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "一句话摘要（30字以内）",
  "description": "详细描述技能需求",
  "reason": "为什么这个技能有价值",
  "actionPlan": ["学习路径1", "学习路径2", ...],
  "matchedSkills": ["相关技能1", "相关技能2", ...],
  "competition": "技能门槛和竞争情况"
}`;

export class SkillMatchAgent extends BaseAgent {
  constructor() {
    super('SkillMatch', SKILL_MATCH_SYSTEM_PROMPT);
  }

  async analyze(tweet: TweetData): Promise<AnalysisResult | null> {
    try {
      const prompt = this.buildPrompt(tweet);
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        type: 'skill',
        score: this.calculateBaseScore(tweet, result.score),
        summary: result.summary,
        description: result.description,
        reason: result.reason,
        actionPlan: result.actionPlan || [],
        matchedSkills: result.matchedSkills || [],
        competition: result.competition,
      };
    } catch (error) {
      console.error('[SkillMatch] Analysis failed:', error);
      return null;
    }
  }

  private buildPrompt(tweet: TweetData): string {
    return `请分析以下推文中的技能需求机会：

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
