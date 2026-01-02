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
import { TopicAgent } from './topic-agent.js';
import type { TweetData, Signal, SignalType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AI_CONFIG } from '../config/ai.js';
import {
  ORCHESTRATOR_SYSTEM_PROMPT,
  SIGNAL_TYPES,
  AGENT_PROMPTS,
  PREFILTER_RULES,
  HOT_TOPIC_KEYWORDS,
  calculateRawViralityScore,
  adjustForAuthorInfluence,
  getViralityTier,
} from '../config/signal-rules.js';

export class OrchestratorAgent {
  protected readonly config = AI_CONFIG;

  // 议题分析 Agent 集合
  private agents: Map<SignalType, TopicAgent>;

  constructor() {
    this.agents = new Map();
    this.initializeAgents();
  }

  /**
   * 初始化所有议题 Agent
   */
  private initializeAgents() {
    // 遍历所有信号类型，创建对应的 TopicAgent
    for (const type of Object.values(SIGNAL_TYPES)) {
      const prompt = AGENT_PROMPTS[type];
      if (prompt) {
        this.agents.set(type, new TopicAgent(type, prompt, type));
      } else {
        logger.warn(`[Orchestrator] No prompt defined for signal type: ${type}`);
      }
    }
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
      const recommendedType = decision.recommendedType as SignalType;
      const agent = this.getAgent(recommendedType || SIGNAL_TYPES.TECH_PRODUCT);
      
      if (!agent) {
        logger.warn(`[Orchestrator] Unknown agent type: ${recommendedType}`);
        return null;
      }

      logger.info(`[Orchestrator] Delegating tweet ${tweet.id} to ${recommendedType} agent`);

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

    // 根据关键词判断类型 (映射到新的7大议题)
    for (const [category, keywords] of Object.entries(HOT_TOPIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          let type: SignalType = SIGNAL_TYPES.TECH_PRODUCT; // 默认回退
          let reason = `包含 ${category} 关键词`;

          // 直接使用 category 作为 type，因为 HOT_TOPIC_KEYWORDS 的 key 现在与 SIGNAL_TYPES 的 value 一致
          // 但为了类型安全，我们做一个显式映射或断言
          if (Object.values(SIGNAL_TYPES).includes(category as SignalType)) {
             type = category as SignalType;
          }

          return {
            shouldAnalyze: true,
            recommendedType: type,
            reason,
          };
        }
      }
    }

    // 高热度推文默认为社会热点
    if (viralityTier === 'viral' || viralityTier === 'high') {
      return {
        shouldAnalyze: true,
        recommendedType: SIGNAL_TYPES.SOCIAL_VIRAL,
        reason: '高热度内容',
      };
    }

    // 中等热度推文默认为观点讨论
    if (viralityTier === 'significant' || viralityTier === 'notable') {
      return {
        shouldAnalyze: true,
        recommendedType: SIGNAL_TYPES.OPINION_DISCUSSION,
        reason: '中等热度有价值内容',
      };
    }

    return { shouldAnalyze: false, reason: '无明显热门特征' };
  }

  /**
   * 获取指定的 Agent
   */
  private getAgent(type: SignalType): TopicAgent | null {
    return this.agents.get(type) || null;
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
      // 使用流式调用以避免超时限制
      const stream = await anthropic.messages.create({
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
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text;
        }
      }

      return fullText;
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
