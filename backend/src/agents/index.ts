/**
 * Agents 入口文件 - 重构版
 * 导出所有热门议题分析 Agent
 */

export { BaseAgent, type AnalysisResult } from './base-agent.js';
export { OrchestratorAgent } from './orchestrator-agent.js';
export { TopicAgent } from './topic-agent.js';

// 旧版 Agent - 已弃用，逻辑已迁移至 TopicAgent
// export { ViralAgent } from './viral-agent.js';
// export { InsightfulAgent } from './insightful-agent.js';
// export { DataDrivenAgent } from './data-driven-agent.js';
// export { IndustryNewsAgent } from './industry-news-agent.js';
// export { ControversialAgent } from './controversial-agent.js';
// export { DemandGapAgent } from './demand-gap-agent.js';
// export { RevenueProofAgent } from './revenue-proof-agent.js';
// export { SkillMatchAgent } from './skill-match-agent.js';
// export { TrendAgent } from './trend-agent.js';
