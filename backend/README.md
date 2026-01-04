# Trend Signal Free (TSF) - Backend Server

趋势信号 (TSF) 后端服务，基于 Flask 和 Anthropic Claude API 构建。

---

## 快速开始

### 1. 环境准备

**系统要求**：
- Python 3.8 或更高版本
- pip (Python 包管理器)
- Anthropic API Key

### 2. 安装依赖

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖包
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# 至少需要配置：
# ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 4. 启动服务

```bash
python app.py
```

服务将在 `http://localhost:3001` 启动。

---

## API 接口

### POST /api/analyze

分析推文并返回高价值信号。

**请求体**：
```json
{
  "tweets": [
    {
      "tweetId": "1234567890",
      "authorName": "用户名",
      "content": "推文内容",
      "engagement": {
        "replies": 10,
        "retweets": 20,
        "likes": 100,
        "views": 1000
      }
    }
  ],
  "userProfile": {
    "persona": "developer",
    "interests": [
      {
        "label": "AI Agent",
        "enabled": true
      }
    ],
    "customKeywords": ["Claude", "React"]
  }
}
```

**响应**：
```json
{
  "signals": [
    {
      "tweetId": "1234567890",
      "isValuable": true,
      "score": 85,
      "aiSummary": "这条推文讨论了...",
      "detailedExplanation": "详细解读...",
      "whyItMatters": "值得关注因为...",
      "keyInsights": ["洞察1", "洞察2"],
      "matchReasons": [
        {
          "type": "keyword",
          "value": "Claude",
          "weight": 0.85
        }
      ]
    }
  ]
}
```

### POST /api/extract-interests

从用户点赞记录中提取兴趣偏好。

**请求体**：
```json
{
  "likes": [
    {
      "content": "推文内容",
      "authorName": "作者名"
    }
  ]
}
```

**响应**：
```json
{
  "interests": [
    {
      "categoryId": "ai_agent",
      "confidence": 0.85,
      "keywords": ["AI", "Agent", "LLM"],
      "reasoning": "用户对 AI Agent 相关内容表现出浓厚兴趣"
    }
  ],
  "recommendedKeywords": ["Claude", "GPT-4", "LangChain"]
}
```

---

## 配置说明

### 环境变量

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `ANTHROPIC_API_KEY` | ✅ | - | Claude API 密钥 |
| `ANTHROPIC_MODEL` | ❌ | `claude-3-5-sonnet-20241022` | 使用的 Claude 模型 |
| `PORT` | ❌ | `3001` | API 服务端口 |
| `API_TIMEOUT` | ❌ | `30` | API 请求超时时间（秒） |
| `LOG_LEVEL` | ❌ | `INFO` | 日志级别 |

### 模型选择
推荐使用🚀 智谱 GLM Coding 超值订阅，兼容Claude API
链接：https://www.bigmodel.cn/glm-coding?ic=U8YF1XGAGD
#调用智谱模型
export ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic
export API_TIMEOUT_MS=3000000
export ANTHROPIC_MODEL=glm-4.7
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export ANTHROPIC_API_KEY=apikey

---

## 开发指南

### 项目结构

```
backend/
├── agent.py          # AI 分析代理
├── app.py            # Flask 应用入口
├── requirements.txt  # Python 依赖
├── .env.example      # 环境变量示例
└── .env              # 环境变量配置（不提交）
```

### 代码架构

**SignalAgent 类** (`agent.py`):
- `analyze_tweets()`: 分析推文价值
- `extract_interests()`: 提取用户兴趣

**Flask 应用** (`app.py`):
- `/api/analyze`: 推文分析接口
- `/api/extract-interests`: 兴趣提取接口

### 添加新功能

1. 在 `agent.py` 中添加分析方法
2. 在 `app.py` 中注册路由
3. 更新 requirements.txt（如果需要新依赖）

---

## 故障排查

### 问题：API 调用失败

**可能原因**：
1. API Key 无效或过期
2. 网络连接问题
3. 超时设置过短

**解决方案**：
```bash
# 检查 API Key
echo $ANTHROPIC_API_KEY

# 测试网络连接
curl https://api.anthropic.com/v1/messages

# 增加超时时间
# 在 .env 中设置: API_TIMEOUT=60
```

### 问题：模型响应异常

**可能原因**：
1. 输入格式不正确
2. Token 限制
3. Prompt 需要优化

**解决方案**：
- 查看日志中的错误信息
- 检查请求数据格式
- 考虑降低 `BATCH_SIZE`

### 问题：端口被占用

**解决方案**：
```bash
# 查看端口占用
lsof -i :3001

# 或在 .env 中更换端口
PORT=3002
```

---

## 性能优化

### 批量处理

调整批量大小以平衡性能和成本：

```python
# 在 .env 中设置
BATCH_SIZE=10  # 增加批量大小
```

### 缓存策略

（待实现）考虑添加 Redis 缓存重复请求。

---

## 安全建议

1. **永远不要**将 `.env` 文件提交到 Git
2. 定期轮换 API Key
3. 使用环境变量管理敏感配置
4. 在生产环境使用 HTTPS
5. 实现 API 速率限制

---

## 部署指南

### 本地部署

参考上面的"快速开始"部分。

### 生产部署

**推荐方案**：

1. **使用 Gunicorn**：
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3001 app:app
```

2. **使用 Docker**：
```dockerfile
# Dockerfile 示例
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:3001", "app:app"]
```

3. **使用云服务**：
   - Render
   - Railway
   - AWS Lambda
   - Google Cloud Run

---

## 许可证

MIT License

---

## 联系方式

如有问题，请提交 Issue。
