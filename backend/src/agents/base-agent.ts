/**
 * Base Agent 类
 * 所有 Agent 的基类
 */

import { AI_CONFIG } from '../config/ai.js';
import type { TweetData, Signal, SignalType } from '../types/index.js';

export interface AnalysisResult {
  type: SignalType;
  score: number;
  summary: string;
  description: string;
  reason: string;
  actionPlan: string[];
  matchedSkills: string[];
  competition: string;
}

export abstract class BaseAgent {
  protected readonly config = AI_CONFIG;

  constructor(
    protected readonly name: string,
    protected readonly systemPrompt: string
  ) {}

  /**
   * 分析推文 - 子类必须实现
   */
  abstract analyze(tweet: TweetData): Promise<AnalysisResult | null>;

  /**
   * 调用 Claude API
   */
  protected async callClaude(userPrompt: string): Promise<string> {
    if (!this.config.authToken && !this.config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { Anthropic } = await import('@anthropic-ai/sdk');

    // 构建 Anthropic 客户端配置
    const clientConfig: any = {
      apiKey: this.config.authToken || this.config.anthropicApiKey,
    };

    // 如果配置了自定义 baseURL（如 PPIO），则使用它
    if (this.config.baseURL) {
      clientConfig.baseURL = this.config.baseURL;
      console.log(`[${this.name}] Using custom API endpoint: ${this.config.baseURL}`);
      console.log(`[${this.name}] Using model: ${this.config.model}`);
    }

    const anthropic = new Anthropic(clientConfig);

    try {
      // 使用流式调用以避免超时限制
      const stream = await anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.systemPrompt,
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
      console.error(`[${this.name}] Claude API error:`, error);
      throw error;
    }
  }

  /**
   * 解析 JSON 响应
   */
  protected parseJSONResponse(text: string): any {
    try {
      // 尝试提取 JSON（处理 markdown 代码块）
      let jsonText = text;
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON:`, text);
      throw new Error(`Invalid JSON response: ${error}`);
    }
  }

  /**
   * 计算基础评分
   */
  protected calculateBaseScore(tweet: TweetData, aiScore: number): number {
    let score = aiScore;

    // 作者影响力加成
    if (tweet.author.verified) score += 0.3;
    if (tweet.author.followerCount > 50000) score += 0.2;
    if (tweet.author.followerCount > 100000) score += 0.3;

    // 互动数据加成
    if (tweet.engagement.likes > 100) score += 0.1;
    if (tweet.engagement.retweets > 50) score += 0.1;

    // 限制在 1-5 分
    return Math.min(5, Math.max(1, Math.round(score * 10) / 10));
  }
}
