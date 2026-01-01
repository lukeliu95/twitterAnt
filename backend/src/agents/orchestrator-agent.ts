/**
 * Orchestrator Agent
 * 负责协调和调度各个专项 Agent
 */

import type { AnalysisResult } from './base-agent.js';
import { DemandGapAgent } from './demand-gap-agent.js';
import { RevenueProofAgent } from './revenue-proof-agent.js';
import { SkillMatchAgent } from './skill-match-agent.js';
import { TrendAgent } from './trend-agent.js';
import type { TweetData, Signal } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AI_CONFIG } from '../config/ai.js';

const ORCHESTRATOR_SYSTEM_PROMPT = `你是一个智能信号协调器，负责判断 Twitter 推文是否包含赚钱机会。

你的任务：
1. 快速判断推文是否值得深入分析
2. 如果值得，将推文分配给最合适的专项 Agent
3. 如果不值得，返回 null

赚钱机会类型：
- demand: 需求缺口 - 人们在寻找解决方案
- revenue: 收入验证 - 真实的收入分享
- skill: 技能需求 - 市场对特定技能的需求
- trend: 趋势机会 - 新兴趋势和机会

返回 JSON 格式：
{
  "shouldAnalyze": true/false,
  "recommendedAgent": "demand" | "revenue" | "skill" | "trend",
  "reason": "简短说明原因"
}`;

export class OrchestratorAgent {
  protected readonly config = AI_CONFIG;
  private demandAgent: DemandGapAgent;
  private revenueAgent: RevenueProofAgent;
  private skillAgent: SkillMatchAgent;
  private trendAgent: TrendAgent;

  constructor() {

    // 初始化专项 Agent
    this.demandAgent = new DemandGapAgent();
    this.revenueAgent = new RevenueProofAgent();
    this.skillAgent = new SkillMatchAgent();
    this.trendAgent = new TrendAgent();
  }

  /**
   * 分析推文并返回信号
   */
  async analyze(tweet: TweetData): Promise<Signal | null> {
    try {
      // 首先判断是否值得分析
      const decision = await this.shouldAnalyze(tweet);

      if (!decision.shouldAnalyze) {
        logger.debug(`[Orchestrator] Skipping tweet ${tweet.id}: ${decision.reason}`);
        return null;
      }

      // 分配给推荐的 Agent
      const agent = this.getAgent(decision.recommendedAgent || 'demand');
      if (!agent) {
        logger.warn(`[Orchestrator] Unknown agent type: ${decision.recommendedAgent}`);
        return null;
      }

      logger.info(`[Orchestrator] Delegating tweet ${tweet.id} to ${decision.recommendedAgent} agent`);

      // 让专项 Agent 分析
      const result = await agent.analyze(tweet);

      if (!result) {
        return null;
      }

      // 构建 Signal 对象
      return this.buildSignal(tweet, result);
    } catch (error) {
      logger.error(`[Orchestrator] Analysis failed for tweet ${tweet.id}:`, error);
      return null;
    }
  }

  /**
   * 判断是否值得分析
   */
  private async shouldAnalyze(tweet: TweetData): Promise<{
    shouldAnalyze: boolean;
    recommendedAgent?: string;
    reason: string;
  }> {
    // 快速过滤：太短的推文直接跳过
    if (tweet.text.length < 30) {
      return { shouldAnalyze: false, reason: '推文太短' };
    }

    // 转推直接跳过
    if (tweet.type === 'retweet') {
      return { shouldAnalyze: false, reason: '转推内容' };
    }

    // 构建判断提示
    const prompt = this.buildJudgmentPrompt(tweet);

    try {
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        shouldAnalyze: result.shouldAnalyze || false,
        recommendedAgent: result.recommendedAgent,
        reason: result.reason || '',
      };
    } catch (error) {
      // AI 判断失败时，使用规则回退
      return this.fallbackJudgment(tweet);
    }
  }

  /**
   * 构建判断提示
   */
  private buildJudgmentPrompt(tweet: TweetData): string {
    return `请分析以下 Twitter 推文是否包含赚钱机会：

推文内容：
${tweet.text}

作者信息：
- 用户名: @${tweet.author.username}
- 认证状态: ${tweet.author.verified ? '已认证' : '未认证'}
- 粉丝数: ${tweet.author.followerCount}

互动数据：
- 点赞: ${tweet.engagement.likes}
- 转发: ${tweet.engagement.retweets}
- 回复: ${tweet.engagement.replies}

请返回 JSON 格式的判断结果。`;
  }

  /**
   * 规则回退判断（AI 失败时使用）
   */
  private fallbackJudgment(tweet: TweetData): {
    shouldAnalyze: boolean;
    recommendedAgent?: string;
    reason: string;
  } {
    const text = tweet.text.toLowerCase();

    // 收入验证关键词
    if (text.includes('revenue') || text.includes('income') || text.includes('$') ||
        text.includes('mrr') || text.includes('arr') || text.includes('赚') ||
        text.includes('收入')) {
      return {
        shouldAnalyze: true,
        recommendedAgent: 'revenue',
        reason: '包含收入验证关键词',
      };
    }

    // 需求缺口关键词
    if (text.includes('looking for') || text.includes('need') || text.includes('want') ||
        text.includes('有没有') || text.includes('求') || text.includes('需要')) {
      return {
        shouldAnalyze: true,
        recommendedAgent: 'demand',
        reason: '包含需求缺口关键词',
      };
    }

    // 技能需求关键词
    if (text.includes('hiring') || text.includes('freelancer') || text.includes('招聘')) {
      return {
        shouldAnalyze: true,
        recommendedAgent: 'skill',
        reason: '包含技能需求关键词',
      };
    }

    // 趋势机会关键词
    if (text.includes('ai') || text.includes('gpt') || text.includes('trending')) {
      return {
        shouldAnalyze: true,
        recommendedAgent: 'trend',
        reason: '包含趋势关键词',
      };
    }

    // 高互动推文仍然值得分析
    if (tweet.engagement.likes > 100 || tweet.engagement.retweets > 50) {
      return {
        shouldAnalyze: true,
        recommendedAgent: 'trend',
        reason: '高互动内容',
      };
    }

    return { shouldAnalyze: false, reason: '无明显信号特征' };
  }

  /**
   * 获取指定的 Agent
   */
  private getAgent(type: string): DemandGapAgent | RevenueProofAgent | SkillMatchAgent | TrendAgent | null {
    switch (type) {
      case 'demand':
        return this.demandAgent;
      case 'revenue':
        return this.revenueAgent;
      case 'skill':
        return this.skillAgent;
      case 'trend':
        return this.trendAgent;
      default:
        return null;
    }
  }

  /**
   * 构建 Signal 对象
   */
  private buildSignal(tweet: TweetData, result: AnalysisResult): Signal {
    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tweetId: tweet.id,
      type: result.type,
      score: result.score,
      summary: result.summary,
      description: result.description,
      reason: result.reason,
      actionPlan: result.actionPlan,
      matchedSkills: result.matchedSkills || [],
      competition: result.competition,
      originalTweet: tweet,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天后过期
    };
  }

  /**
   * 调用 Claude API
   */
  private async callClaude(userPrompt: string): Promise<string> {
    if (!this.config.authToken && !this.config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { Anthropic } = await import('@anthropic-ai/sdk');

    const clientConfig: any = {
      apiKey: this.config.authToken || this.config.anthropicApiKey,
    };

    if (this.config.baseURL) {
      clientConfig.baseURL = this.config.baseURL;
    }

    const anthropic = new Anthropic(clientConfig);

    try {
      const response = await anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      logger.error(`[Orchestrator] Claude API error:`, error);
      throw error;
    }
  }

  /**
   * 解析 JSON 响应
   */
  private parseJSONResponse(text: string): any {
    try {
      let jsonText = text;
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error(`[Orchestrator] Failed to parse JSON:`, text);
      throw new Error(`Invalid JSON response: ${error}`);
    }
  }
}
