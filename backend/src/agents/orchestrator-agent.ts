/**
 * Orchestrator Agent - 重构版
 * 负责识别用户时间线上最热门、最有价值的讨论
 *
 * 设计原则 (Alan Cooper):
 * - 用户目标：不错过重要讨论
 * - 核心价值：发现热门议题，获取社交资本
 * - 交互原则：快速、准确、有价值
 */

import type { AnalysisResult } from './base-agent.js';
import { ViralAgent } from './viral-agent.js';
import { InsightfulAgent } from './insightful-agent.js';
import { DataDrivenAgent } from './data-driven-agent.js';
import { IndustryNewsAgent } from './industry-news-agent.js';
import { ControversialAgent } from './controversial-agent.js';
import type { TweetData, Signal, SignalType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AI_CONFIG } from '../config/ai.js';
import {
  ORCHESTRATOR_SYSTEM_PROMPT,
  SIGNAL_TYPES,
  PREFILTER_RULES,
  HOT_TOPIC_KEYWORDS,
  calculateRawViralityScore,
  adjustForAuthorInfluence,
  getViralityTier,
} from '../config/signal-rules.js';

export class OrchestratorAgent {
  protected readonly config = AI_CONFIG;

  // 新的专项 Agent
  private viralAgent: ViralAgent;
  private insightfulAgent: InsightfulAgent;
  private dataDrivenAgent: DataDrivenAgent;
  private industryNewsAgent: IndustryNewsAgent;
  private controversialAgent: ControversialAgent;

  constructor() {
    this.viralAgent = new ViralAgent();
    this.insightfulAgent = new InsightfulAgent();
    this.dataDrivenAgent = new DataDrivenAgent();
    this.industryNewsAgent = new IndustryNewsAgent();
    this.controversialAgent = new ControversialAgent();
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
      const agent = this.getAgent(decision.recommendedType || SIGNAL_TYPES.VIRAL);
      if (!agent) {
        logger.warn(`[Orchestrator] Unknown agent type: ${decision.recommendedType}`);
        return null;
      }

      logger.info(`[Orchestrator] Delegating tweet ${tweet.id} to ${decision.recommendedType} agent`);

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
    recommendedType?: string;
    reason: string;
  }> {
    // 1. 前端过滤规则
    if (tweet.text.length < PREFILTER_RULES.minTextLength) {
      return { shouldAnalyze: false, reason: '推文太短' };
    }

    if (PREFILTER_RULES.excludeTypes.includes(tweet.type as any)) {
      return { shouldAnalyze: false, reason: '排除的推文类型' };
    }

    // 2. 计算热度分数
    const rawScore = calculateRawViralityScore(
      tweet.engagement.likes,
      tweet.engagement.retweets,
      tweet.engagement.replies,
      tweet.engagement.views
    );

    const adjustedScore = adjustForAuthorInfluence(
      rawScore,
      tweet.author.verified,
      tweet.author.followerCount
    );

    const viralityTier = getViralityTier(adjustedScore);

    // 3. 应用热度阈值
    const thresholds = PREFILTER_RULES.engagementThresholds;

    // 大 V 的推文降低阈值
    const thresholdDivisor =
      tweet.author.followerCount >= PREFILTER_RULES.bigFollowerThreshold ? 5 : 1;

    // 检查是否达到阈值
    const meetsThreshold =
      tweet.engagement.likes >= thresholds.likes / thresholdDivisor ||
      tweet.engagement.retweets >= thresholds.retweets ||
      tweet.engagement.replies >= thresholds.replies;

    if (!meetsThreshold && viralityTier === 'minimal') {
      return { shouldAnalyze: false, reason: '热度不足' };
    }

    // 4. 尝试 AI 判断
    const prompt = this.buildJudgmentPrompt(tweet, viralityTier);
    try {
      const response = await this.callClaude(prompt);
      const result = this.parseJSONResponse(response);

      return {
        shouldAnalyze: result.shouldAnalyze || false,
        recommendedType: result.recommendedType,
        reason: result.reason || '',
      };
    } catch (error) {
      // AI 判断失败时，使用规则回退
      return this.fallbackJudgment(tweet, viralityTier);
    }
  }

  /**
   * 构建判断提示
   */
  private buildJudgmentPrompt(tweet: TweetData, viralityTier: string): string {
    return `请分析以下 Twitter 推文是否是值得关注的热门讨论：

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
- 浏览: ${tweet.engagement.views || 'N/A'}
- 热度等级: ${viralityTier}

请返回 JSON 格式的判断结果。`;
  }

  /**
   * 规则回退判断（AI 失败时使用）
   */
  private fallbackJudgment(tweet: TweetData, viralityTier: string): {
    shouldAnalyze: boolean;
    recommendedType?: string;
    reason: string;
  } {
    const text = tweet.text.toLowerCase();

    // 根据关键词判断类型
    for (const [category, keywords] of Object.entries(HOT_TOPIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          let type: SignalType = SIGNAL_TYPES.INSIGHTFUL;
          let reason = `包含 ${category} 关键词`;

          // 根据类别映射到信号类型
          switch (category) {
            case 'tech':
            case 'industry':
              type = SIGNAL_TYPES.INDUSTRY_NEWS as any;
              break;
            case 'data':
              type = SIGNAL_TYPES.DATA_DRIVEN as any;
              break;
            case 'discussion':
              type = SIGNAL_TYPES.CONTROVERSIAL as any;
              break;
            case 'opinion':
            case 'tutorial':
              type = SIGNAL_TYPES.INSIGHTFUL as any;
              break;
          }

          return {
            shouldAnalyze: true,
            recommendedType: type,
            reason,
          };
        }
      }
    }

    // 高热度推文默认为爆发话题
    if (viralityTier === 'viral' || viralityTier === 'high') {
      return {
        shouldAnalyze: true,
        recommendedType: SIGNAL_TYPES.VIRAL,
        reason: '高热度内容',
      };
    }

    // 中等热度推文默认为深度讨论
    if (viralityTier === 'significant' || viralityTier === 'notable') {
      return {
        shouldAnalyze: true,
        recommendedType: SIGNAL_TYPES.INSIGHTFUL,
        reason: '中等热度有价值内容',
      };
    }

    return { shouldAnalyze: false, reason: '无明显热门特征' };
  }

  /**
   * 获取指定的 Agent
   */
  private getAgent(type: string):
    | ViralAgent
    | InsightfulAgent
    | DataDrivenAgent
    | IndustryNewsAgent
    | ControversialAgent
    | null {
    switch (type) {
      case SIGNAL_TYPES.VIRAL:
        return this.viralAgent;
      case SIGNAL_TYPES.INSIGHTFUL:
        return this.insightfulAgent;
      case SIGNAL_TYPES.DATA_DRIVEN:
        return this.dataDrivenAgent;
      case SIGNAL_TYPES.INDUSTRY_NEWS:
        return this.industryNewsAgent;
      case SIGNAL_TYPES.CONTROVERSIAL:
        return this.controversialAgent;
      default:
        return null;
    }
  }

  /**
   * 构建 Signal 对象
   */
  private buildSignal(tweet: TweetData, result: AnalysisResult): Signal {
    // 根据评分决定有效期
    const expiryMs =
      result.score >= 4
        ? 14 * 24 * 60 * 60 * 1000 // 高分 14 天
        : result.score <= 2
        ? 3 * 24 * 60 * 60 * 1000 // 低分 3 天
        : 7 * 24 * 60 * 60 * 1000; // 默认 7 天

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
      expiresAt: new Date(Date.now() + expiryMs),
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
