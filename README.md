# 趋势信号 (Trend Signal Free - TSF)

> "计算机应该为人服务，而不是人服务于计算机。" — *致敬 Alan Cooper 的目标导向设计理念*

**趋势信号 (TSF)** 是一个智能 Chrome 浏览器插件，专为 Twitter (X.com) 深度用户设计。它利用 Claude 的 AI 能力，自动在后台检测、筛选高价值推文，并通过侧边栏呈现结构化的洞察摘要，帮助你从噪音中发现机会。

## 🌟 核心特性

-   **被动智能**: 无需主动搜索，在你浏览时自动分析时间线。
-   **AI 驱动**: 基于 Claude Agent 的深度语义理解，精准识别高价值信号。
-   **侧边栏交互**: 点击插件图标即可唤出沉浸式侧边栏，不打断浏览体验。
-   **七大价值透镜**: 自动将推文分类为技术、商业、变现、数据、技能、观点和热点。

## 🚀 快速开始

TSF 采用前后端分离架构：Chrome 插件负责数据捕获与展示，Python 后端负责 AI 分析。

### 1. 启动后端智能引擎

后端服务使用 Flask + Anthropic SDK 构建。

**前置要求**:
-   Python 3.8+
-   Anthropic API Key

**步骤**:

```bash
# 1. 进入后端目录
cd backend

# 2. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
# 复制 .env.example (如果有) 或直接创建 .env
echo "ANTHROPIC_API_KEY=你的_sk_ant_xxxx" > .env
echo "PORT=3001" >> .env

# 5. 启动服务
python app.py
```

服务将在 `http://localhost:3001` 启动。

### 2. 构建并安装插件

**步骤**:

```bash
# 1. 回到项目根目录并安装依赖
cd ..
npm install

# 2. 构建插件
npm run build
```

构建产物将生成在 `dist` 目录下。

### 3. 加载到 Chrome

1.  打开 Chrome 浏览器，访问 `chrome://extensions`。
2.  开启右上角的 **"开发者模式" (Developer Mode)**。
3.  点击 **"加载已解压的扩展程序" (Load Unpacked)**。
4.  选择本项目根目录下的 `dist` 文件夹。

## 📖 使用指南

1.  **浏览 Twitter**: 打开 [x.com](https://x.com) 并登录。
2.  **自动分析**: 像往常一样滚动浏览。插件会自动捕获新推文并发送给后端进行 AI 分析（Console 会输出日志）。
3.  **发现信号**:
    *   点击浏览器工具栏中的 **TSF 图标**，侧边栏将从右侧滑出。
    *   当 AI 发现高价值推文（评分 >= 70）时，它们会出现在侧边栏列表中。
    *   点击卡片可查看 AI 生成的摘要、匹配原因及原推文。

## 🛠 技术架构

-   **前端 (Extension)**:
    -   React 18 + TypeScript + Vite
    -   Tailwind CSS (纸墨风格 UI)
    -   Zustand (状态管理)
    -   Manifest V3 (Service Worker + Content Script)
-   **后端 (Backend)**:
    -   Python + Flask
    -   Anthropic SDK (Claude 3.5 Sonnet)
    -   Agentic Workflow (基于 Prompt Engineering 的信号分析)

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！

## 📄 许可证

MIT License
