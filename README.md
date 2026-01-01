# Money Signal

> Twitter 上的赚钱机会探测器 - 用 AI 发现市场需求、收入验证、技能需求和趋势机会

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)

---

## 项目概述

Money Signal 是一款基于 Chrome 浏览器的扩展程序，通过 AI 分析 Twitter 推文，自动识别和提取有价值的赚钱机会信号。采用 **Local First** 架构，所有数据存储在本地，完全保护用户隐私。

### 核心特性

- 🔍 **自动发现**: 实时分析 Twitter 推文，自动识别赚钱机会
- 🤖 **AI 驱动**: 使用 Claude AI 深度分析推文内容
- 💡 **四种信号类型**: 需求缺口、收入验证、技能需求、趋势机会
- ⭐ **智能评分**: 基于多维度因素计算信号价值
- 🔖 **简化交互**: 单一书签图标操作，符合 Alan Cooper 设计原则
- 💾 **本地优先**: 数据存储在本地 SQLite 数据库
- 🔒 **隐私保护**: 无需账户，完全匿名使用

### 信号类型

| 类型 | 图标 | 描述 | 示例 |
|-----|------|------|-----|
| **需求缺口** | 💡 | 用户愿意付费的明确需求 | "Looking for a tool that can..." |
| **收入验证** | 💰 | 真实的收入分享证明 | "Just made $10K from my side project..." |
| **技能需求** | 🛠️ | 市场对特定技能的需求 | "Hiring: React developer with..." |
| **趋势机会** | 📈 | 新兴趋势和早期机会 | "AI is revolutionizing..." |

---

## 快速开始

### 环境要求

- Node.js 23.x+
- pnpm 9.x+
- Chrome 浏览器

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd twitterAnt

# 安装后端依赖
cd backend
pnpm install

# 安装扩展依赖
cd ../extension
pnpm install
```

### 配置

创建 `backend/.env` 文件：

```env
# Anthropic Claude API (可选，用于 AI 分析)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 服务配置
PORT=3001
NODE_ENV=development
```

### 启动

**终端 1 - 后端服务**:
```bash
cd backend
pnpm dev
```

**终端 2 - 扩展构建**:
```bash
cd extension
pnpm build:watch
```

### 加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension/dist` 目录

---

## 项目结构

```
twitterAnt/
├── backend/                 # 后端服务 (Hono + Node.js)
│   ├── src/
│   │   ├── agents/         # AI Agent 系统
│   │   ├── config/         # 配置文件
│   │   ├── database/       # 数据库 (sql.js + SQLite)
│   │   ├── routes/         # API 路由
│   │   ├── types/          # TypeScript 类型
│   │   └── index.ts        # 服务入口
│   └── data/               # 本地数据库
│
├── extension/              # Chrome 扩展
│   ├── src/
│   │   ├── background/     # Service Worker
│   │   ├── content/        # Content Script
│   │   ├── sidepanel/      # Side Panel UI
│   │   └── shared/         # 共享代码
│   └── manifest.json       # 扩展清单
│
└── Docs/                   # 项目文档
    ├── 06-feature-specification-20260101.md
    ├── 07-architecture-overview-20260101.md
    └── 08-quick-start-guide-20260101.md
```

---

## 文档

### 核心文档

| 文档 | 描述 |
|-----|------|
| [功能说明文档](./Docs/06-feature-specification-20260101.md) | 完整的功能说明和用户指南 |
| [架构概览](./Docs/07-architecture-overview-20260101.md) | 系统架构和数据流详解 |
| [快速开始指南](./Docs/08-quick-start-guide-20260101.md) | 开发者快速入门 |
| [项目结构](./Docs/01-project-structure.md) | 目录结构说明 |
| [技术实现](./Docs/02-technical-implementation.md) | 技术实现细节 |
| [API 设计](./Docs/03-api-design.md) | REST API 规范 |
| [数据库设计](./Docs/04-database-design.md) | 数据库 Schema |
| [开发路线图](./Docs/05-development-roadmap.md) | 未来规划 |

---

## 技术栈

### 后端

- **运行时**: Node.js 23.x
- **框架**: Hono 4.x
- **数据库**: sql.js (SQLite)
- **AI**: Anthropic Claude API
- **语言**: TypeScript 5.x

### 扩展

- **平台**: Chrome Extension Manifest V3
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **包管理器**: pnpm 9.x

---

## 开发

### 本地开发

```bash
# 后端开发
cd backend
pnpm dev

# 扩展开发
cd extension
pnpm build:watch
```

### 构建

```bash
# 后端
cd backend
pnpm build

# 扩展
cd extension
pnpm build
```

### 测试

```bash
# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

---

## API 示例

### 提交推文

```bash
POST /api/v1/tweets/batch
Content-Type: application/json

{
  "tweets": [
    {
      "id": "1234567890",
      "text": "Looking for a tool that can automate...",
      "author": {
        "username": "johndoe",
        "displayName": "John Doe",
        "verified": true,
        "followerCount": 50000
      },
      "engagement": {
        "replies": 10,
        "retweets": 25,
        "likes": 150,
        "views": 5000
      },
      "timestamp": "2026-01-01T12:00:00Z",
      "url": "https://twitter.com/johndoe/status/1234567890",
      "type": "original"
    }
  ]
}
```

### 获取信号

```bash
GET /api/v1/signals?type=demand&savedOnly=true&limit=20
```

### 切换书签

```bash
PATCH /api/v1/signals/:id/bookmark
```

---

## 设计理念

### Alan Cooper 交互设计原则

- **简化交互**: 单一书签图标操作，减少认知负荷
- **目标导向**: 快速筛选和保存感兴趣的信号
- **即时反馈**: 清晰的视觉状态指示

### Local First 架构

- **数据所有权**: 用户数据存储在本地
- **隐私保护**: 无需账户，完全匿名
- **离线可用**: 核心功能不依赖网络
- **数据可移植**: 用户可导出和备份

---

## 路线图

### v1.0.0 (当前版本)

- ✅ 四种信号类型识别
- ✅ AI Agent 分析系统
- ✅ Local First 数据存储
- ✅ 简化的书签交互
- ✅ Side Panel UI

### 未来版本

- ⏳ 推送通知功能
- ⏳ 数据导出功能
- ⏳ 自定义信号过滤器
- ⏳ 多语言支持
- ⏳ 统计仪表板
- ⏳ Firefox 版本

---

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 提交信息规范

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 致谢

- [Alan Cooper](https://www.cooper.com/) - 交互设计理念
- [Anthropic](https://www.anthropic.com/) - Claude AI API
- [Hono](https://hono.dev/) - 轻量级 Web 框架
- [sql.js](https://sql.js.org/) - 纯 JavaScript SQLite

---

## 联系方式

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

**Money Signal** - 让每一个推文都成为赚钱机会 💰
