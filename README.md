# 趋势信号 (Trend Signal Free - TSF)

> "计算机应该为人服务，而不是人服务于计算机。" — *致敬 Alan Cooper 的目标导向设计理念*

**趋势信号 (TSF)** 是一个智能 Chrome 浏览器插件，专为 Twitter (X.com) 深度用户设计。它利用 Claude 的 AI 能力，自动在后台检测、筛选高价值推文，并通过非侵入式的信号卡片直接在信息流中呈现结构化洞察。

---

## 目录

- [核心特性](#核心特性)
- [功能详解](#功能详解)
- [快速开始](#快速开始)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [使用指南](#使用指南)
- [开发指南](#开发指南)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

---

## 核心特性

### 🧠 智能兴趣分析
- **自动学习**：通过分析你最近点赞的 100 条推文，自动识别兴趣方向
- **AI 驱动**：基于 Claude 深度语义理解，精准提取兴趣类别和关键词
- **个性化推荐**：根据你的兴趣偏好，智能推荐相关关键词

### 📊 实时信号检测
- **被动智能**：无需主动搜索，在你浏览时自动分析时间线
- **直接嵌入**：信号卡片直接显示在信息流中，无需点击额外按钮
- **智能匹配**：根据你的兴趣关键词、互动热度、时间新鲜度综合评分

### 🎨 非侵入式设计
- **原生体验**：卡片嵌入 Twitter 原生界面，不影响浏览习惯
- **渐入动画**：平滑的进入效果，视觉友好
- **主题适配**：自动适配深色/浅色主题，确保可读性
- **收起/展开**：用户可自由控制卡片展开状态

### ⚙️ 灵活设置
- **兴趣管理**：启用/禁用特定兴趣类别
- **关键词管理**：添加自定义关键词，精确控制匹配范围
- **进度追踪**：实时显示数据收集和分析进度

---

## 功能详解

### 1. 兴趣分析流程

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  点击"开始分析"  │ -> │  打开 Likes 页面 │ -> │  自动滚动收集   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  完成分析展示    │ <- │  AI 提取兴趣    │ <- │  收集 100 条   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**特点**：
- 自动滚动页面，无需手动操作
- 实时显示收集进度（X/100）
- 收集完成后自动分析
- 只执行一次，避免重复

### 2. 信号卡片显示

**卡片结构**：
```
┌─────────────────────────────────────────────────┐
│ 🔥 趋势信号                    [▼]             │ <- 顶部徽章 + 收起按钮
├─────────────────────────────────────────────────┤
│ 🔑 AI Agent  💡 产品设计     📌 技术趋势        │ <- 匹配原因标签
│                                                 │
│ 这条推文讨论了 AI Agent 的产品设计原则，强调...  │ <- AI 摘要
└─────────────────────────────────────────────────┘
```

**评分标准**：
- 🔥 **高匹配 (≥85分)**：金色徽章，强烈推荐
- 📊 **中等匹配 (70-84分)**：半透明徽章
- **低匹配 (<70分)**：不显示

### 3. 侧边栏功能

**设置页面**：
- 兴趣类别管理（启用/禁用）
- 推荐关键词快速添加
- 自定义关键词管理
- 分析进度追踪

**信号列表**：
- 集中查看所有检测到的信号
- 支持反馈（有用/不感兴趣/错误）
- 支持收藏功能
- 直接跳转原推文

---

## 快速开始

TSF 采用前后端分离架构：Chrome 插件负责数据捕获与展示，Python 后端负责 AI 分析。

### 1. 启动后端服务

**前置要求**：
- Python 3.8+
- Anthropic API Key

**步骤**：

```bash
# 1. 进入后端目录
cd backend

# 2. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
echo "ANTHROPIC_API_KEY=你的_sk_ant_xxxx" > .env
echo "ANTHROPIC_MODEL=claude-3-5-sonnet-20241022" >> .env
echo "PORT=3001" >> .env

# 5. 启动服务
python app.py
```

服务将在 `http://localhost:3001` 启动。

### 2. 构建并安装插件

**步骤**：

```bash
# 1. 回到项目根目录并安装依赖
cd ..
npm install

# 2. 构建插件
npm run build
```

构建产物将生成在 `dist` 目录下。

### 3. 加载到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择本项目根目录下的 `dist` 文件夹

---

## 技术架构

### 前端 (Extension)

```
┌─────────────────────────────────────────────────────────┐
│                      Chrome Extension                    │
├─────────────────────────────────────────────────────────┤
│  Background Service Worker                              │
│  - 消息路由和转发                                        │
│  - 与后端 API 通信                                       │
│  - 信号数据存储和同步                                    │
├─────────────────────────────────────────────────────────┤
│  Content Script (注入到 Twitter 页面)                   │
│  - TweetCapture: 推文数据捕获                            │
│  - SignalIndicatorManager: 信号卡片管理                 │
│  - SidebarManager: 侧边栏控制                            │
├─────────────────────────────────────────────────────────┤
│  Sidebar UI (React)                                     │
│  - 信号列表展示                                          │
│  - 设置页面                                              │
│  - 用户交互                                              │
└─────────────────────────────────────────────────────────┘
```

**技术栈**：
- **React 18** + TypeScript
- **Vite** (构建工具)
- **Zustand** (状态管理)
- **Tailwind CSS** (样式)
- **Lucide React** (图标)
- **Manifest V3** (扩展规范)

### 后端 (Backend)

```
┌─────────────────────────────────────────────────────────┐
│                    Flask API Server                     │
├─────────────────────────────────────────────────────────┤
│  /api/analyze           推文分析接口                     │
│  /api/extract-interests 兴趣提取接口                     │
├─────────────────────────────────────────────────────────┤
│  SignalAgent           AI 分析代理                       │
│  - analyze_tweets()    分析推文价值                     │
│  - extract_interests() 提取用户兴趣                     │
├─────────────────────────────────────────────────────────┤
│  Anthropic Claude API                                   │
│  - 深度语义理解                                         │
│  - 兴趣偏好分析                                         │
│  - 信号摘要生成                                         │
└─────────────────────────────────────────────────────────┘
```

**技术栈**：
- **Python 3.8+**
- **Flask** (Web 框架)
- **Anthropic SDK** (Claude API)
- **python-dotenv** (环境变量)

---

## 项目结构

```
twitterAnt/
├── backend/                    # Python 后端服务
│   ├── agent.py               # AI 分析代理
│   ├── app.py                 # Flask API 入口
│   ├── requirements.txt       # Python 依赖
│   └── .env                   # 环境变量配置
│
├── src/                        # 前端源代码
│   ├── background/            # 后台脚本
│   │   └── index.ts          # Service Worker
│   │
│   ├── content/               # 内容脚本
│   │   ├── index.ts          # 主入口（推文捕获）
│   │   ├── SignalIndicatorManager.ts  # 信号卡片管理
│   │   └── styles.css        # 内容脚本样式
│   │
│   ├── sidebar/               # 侧边栏 UI
│   │   ├── App.tsx           # 主应用组件
│   │   ├── components/       # UI 组件
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── store.ts          # Zustand 状态管理
│   │   └── main.tsx          # React 入口
│   │
│   └── types/                 # TypeScript 类型定义
│       └── index.ts
│
├── public/                     # 静态资源
│   └── manifest.json          # 扩展配置清单
│
├── Docs/                       # 项目文档
│   ├── product-design.md      # 产品设计文档
│   └── TSF 产品规格说明书.md
│
├── dist/                       # 构建输出（加载到 Chrome）
├── package.json               # Node.js 配置
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 本文件
```

---

## 使用指南

### 首次使用

1. **兴趣分析**
   - 打开侧边栏（点击插件图标）
   - 进入"设置"页面
   - 点击"开始分析我的兴趣"
   - 等待收集和分析完成（约1-2分钟）

2. **浏览信号**
   - 正常浏览 Twitter 信息流
   - 高价值推文会自动显示信号卡片
   - 点击卡片上的收起按钮可折叠详情

3. **管理兴趣**
   - 在设置页面查看分析出的兴趣类别
   - 启用/禁用特定兴趣
   - 添加自定义关键词

### 日常使用

- **自动检测**：插件在后台自动分析新推文
- **信号卡片**：匹配度 >= 70 的推文会显示卡片
- **侧边栏**：点击插件图标查看所有信号
- **反馈学习**：对信号进行反馈，帮助改进算法

---

## 开发指南

### 本地开发

```bash
# 1. 启动后端服务
cd backend
source venv/bin/activate
python app.py

# 2. 启动前端开发服务器（新终端）
npm run dev

# 3. 构建生产版本
npm run build

# 4. 重新加载扩展
# 在 chrome://extensions 点击刷新按钮
```

### 调试技巧

**查看日志**：
- Content Script: F12 → Console
- Background: chrome://extensions → Service Worker → inspect
- Backend: 终端输出

**热重载**：
- 前端代码修改后自动重新构建
- 修改后需要在 chrome://extensions 手动刷新

### 代码规范

- **TypeScript**: 使用严格模式
- **React**: 使用函数组件和 Hooks
- **样式**: 使用 Tailwind CSS 工具类
- **命名**: 驼峰命名法，组件用 PascalCase

---

## 配置说明

### 后端环境变量

```bash
# .env 文件配置
ANTHROPIC_API_KEY=sk-ant-xxxxx        # Claude API 密钥（必需）
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # 使用的模型（可选）
PORT=3001                             # API 服务端口（可选）
```

### 扩展权限

`manifest.json` 中的权限说明：
- `storage`: 存储用户数据和信号
- `notifications`: 发送系统通知（可选）
- `activeTab`: 访问当前标签页内容
- `host_permissions`: 访问 Twitter/X.com

---

## 常见问题

### Q: 为什么没有检测到信号？
**A**: 可能原因：
1. 后端服务未启动
2. API Key 未配置或无效
3. 尚未进行兴趣分析
4. 当前推文匹配度 < 70

### Q: 兴趣分析一直卡住？
**A**: 检查：
1. 后端服务是否正常运行
2. Likes 页面是否能正常访问
3. 浏览器控制台是否有错误

### Q: 卡片显示异常？
**A**: 尝试：
1. 刷新 Twitter 页面
2. 重新加载扩展
3. 清除扩展数据

### Q: 如何重新进行兴趣分析？
**A**: 在设置页面点击"重新分析"按钮即可

---

## 路线图

### v1.1 (计划中)
- [ ] 用户行为学习算法
- [ ] 信号分组和聚合
- [ ] 社交信号增强
- [ ] 时间感知推荐

### v1.2 (未来)
- [ ] 多语言支持
- [ ] 自定义主题
- [ ] 导出功能
- [ ] API 开放平台

---

## 贡献指南

欢迎提交 Issue 或 Pull Request！

**贡献流程**：
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 致谢

- [Anthropic](https://www.anthropic.com/) - Claude AI API
- [Twitter](https://twitter.com) - 平台支持
- 所有贡献者和用户

---

## 联系方式

- 提交 [Issue](https://github.com/your-repo/issues)
- 讨论 [Discussions](https://github.com/your-repo/discussions)

---

**版本**: 1.0.0
**最后更新**: 2026-01-03
