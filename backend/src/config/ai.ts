/**
 * AI 配置
 */

// 手动加载 .env 文件
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !line.trim().startsWith('#')) {
      const value = valueParts.join('=').trim();
      // 移除引号
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key] = cleanValue;
    }
  });
  console.log('[Config] .env file loaded');
} catch (error) {
  console.log('[Config] No .env file found, using system env vars');
}

export const AI_CONFIG = {
  // Claude API 配置
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  authToken: process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '', // PPIO 使用 authToken
  baseURL: process.env.ANTHROPIC_BASE_URL, // 支持 PPIO 等兼容服务
  model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  maxTokens: 128000,
  temperature: 0.3,

  // 分析配置
  maxRetries: 3,
  timeout: 30000, // 30 秒

  // 成本控制
  dailyBudget: 10, // 每天最大美元数
  costPerInputToken: 0.000003, // Sonnet 价格
  costPerOutputToken: 0.000015,
};

/**
 * 检查 AI 配置是否有效
 */
export function isAIConfigured(): boolean {
  return !!AI_CONFIG.anthropicApiKey || !!AI_CONFIG.authToken;
}
