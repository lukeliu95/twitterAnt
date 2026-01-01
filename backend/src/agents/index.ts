/**
 * Agents 入口文件 - 重构版
 * 导出所有热门议题分析 Agent
 */

export { BaseAgent, type AnalysisResult } from './base-agent.js';
export { OrchestratorAgent } from './orchestrator-agent.js';

// 新的热门议题 Agent
export { ViralAgent } from './viral-agent.js';
export { InsightfulAgent } from './insightful-agent.js';
export { DataDrivenAgent } from './data-driven-agent.js';
export { IndustryNewsAgent } from './industry-news-agent.js';
export { ControversialAgent } from './controversial-agent.js';

// 旧版"赚钱"类 Agent - 保留用于向后兼容（已弃用）
export { DemandGapAgent } from './demand-gap-agent.js';
export { RevenueProofAgent } from './revenue-proof-agent.js';
export { SkillMatchAgent } from './skill-match-agent.js';
export { TrendAgent } from './trend-agent.js';
