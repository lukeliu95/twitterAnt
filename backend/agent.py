"""
趋势信号 (Twitter Ant) - AI 信号分析代理

这个模块负责使用 Claude AI 分析推文，识别高价值的趋势信号。
"""

import os
import json
from typing import List, Dict, Any
from anthropic import Anthropic
from dotenv import load_dotenv

# 加载环境变量（从 .env 文件读取 API 密钥等配置）
load_dotenv()


class SignalAgent:
    """
    信号分析代理类

    使用 Claude AI 分析 Twitter 推文，根据用户画像识别有价值的内容。
    """

    def __init__(self):
        """
        初始化信号分析代理

        从环境变量中读取：
        - ANTHROPIC_API_KEY: Claude API 密钥
        - ANTHROPIC_MODEL: 使用的模型名称（如 claude-3-5-sonnet-20241022）
        """
        # 创建 Claude API 客户端
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        # 获取配置的模型名称
        self.model = os.getenv("ANTHROPIC_MODEL")

    def analyze_tweets(self, tweets: List[Dict], user_profile: Dict) -> Dict:
        """
        分析推文并返回高价值信号

        参数:
            tweets: 推文列表，每条推文包含 tweetId, authorName, content, engagement 等信息
            user_profile: 用户画像，包含 persona, interests, customKeywords 等信息

        返回:
            Dict: 包含 signals 列表的字典，每条信号包含：
                - tweetId: 推文ID
                - isValuable: 是否有价值
                - category: 分类标签
                - score: 评分 (0-100)
                - aiSummary: AI 摘要
                - detailedExplanation: 详细解读（中文）
                - whyItMatters: 为什么值得关注（中文）
                - keyInsights: 关键洞察点列表
                - matchReasons: 匹配原因列表
        """
        # 构建分析提示词
        prompt = self._construct_analysis_prompt(tweets, user_profile)

        try:
            # 调用 Claude API 进行分析
            message = self.client.messages.create(
                model=self.model,              # 使用的模型
                max_tokens=4096,               # 最大生成 token 数
                temperature=0,                 # 温度设为 0，获得更确定性的输出
                system="You are a professional Twitter content analysis assistant. Your goal is to filter noise and identify high-value information for the user.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # 提取响应内容
            content = message.content[0].text

            # 如果 Claude 将 JSON 包装在 markdown 代码块中，需要提取出来
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            # 解析 JSON 并返回
            return json.loads(content)

        except Exception as e:
            # 发生错误时返回空信号列表
            print(f"分析推文时出错: {e}")
            return {"signals": []}

    def _construct_analysis_prompt(self, tweets: List[Dict], user_profile: Dict) -> str:
        """
        构建推文分析的提示词

        参数:
            tweets: 推文列表
            user_profile: 用户画像

        返回:
            str: 完整的分析提示词
        """
        # 简化推文数据以节省 token（只保留必要字段）
        simplified_tweets = []
        for t in tweets:
            simplified_tweets.append({
                "id": t.get("tweetId"),         # 推文ID
                "author": t.get("authorName"),  # 作者名称
                "content": t.get("content"),    # 推文内容
                "metrics": t.get("engagement")  # 互动数据
            })

        # 构建完整的提示词
        return f"""用户信息:
- 身份: {user_profile.get('persona', 'unknown')}
- 关注领域: {', '.join([i['label'] for i in user_profile.get('interests', []) if i.get('enabled')])}
- 自定义关键词: {', '.join(user_profile.get('customKeywords', []))}

任务:
分析以下推文，判断它们是否对用户有价值。对于有价值的推文，需要用**中文**提供深入解读。

推文列表:
{json.dumps(simplified_tweets, ensure_ascii=False, indent=2)}

输出格式 (JSON):
{{
  "signals": [
    {{
      "tweetId": "...",
      "isValuable": true,
      "category": "...",
      "score": 85,
      "aiSummary": "用一句话概括核心价值",
      "detailedExplanation": "详细解读这条推文想说明什么问题、为什么值得关注",
      "whyItMatters": "解释这个信息对用户的意义",
      "keyInsights": ["提取2-3个关键洞察点"],
      "matchReasons": [
        {{
          "type": "keyword",
          "value": "具体关键词",
          "weight": 0.85
        }}
      ]
    }}
  ]
}}

解读要求（重要）:
1. **语言**: 必须使用**中文**进行解读，无论原文是什么语言
2. **受众**: 假设读者是**高中生水平**，用通俗易懂的语言解释
3. **结构**:
   - 先说明"这条推文在讲什么"
   - 再解释"为什么这个问题值得关注"
   - 最后给出"对读者有什么启发"
4. **深度**: 既要通俗易懂，又要传达核心洞察

评分标准:
1. 关键词匹配度 (40%)
2. 内容质量 (30%)
3. 互动热度 (20%)
4. 时间新鲜度 (10%)

注意事项:
- 只返回 score >= 70 的高价值信号
- detailedExplanation 要用3-5句话详细解读，确保高中生也能理解
- 避免使用专业术语，必要时用比喻或类比
- aiSummary 保持简洁，detailedExplanation 提供深度
- 必须输出合法的 JSON 格式
"""

    def extract_interests(self, likes: List[Dict]) -> Dict:
        """
        从用户的点赞记录中提取兴趣偏好

        参数:
            likes: 用户点赞的推文列表

        返回:
            Dict: 包含兴趣分析结果的字典：
                - interests: 兴趣列表，每个兴趣包含 categoryId, confidence, keywords, reasoning
                - recommendedKeywords: 推荐的关键词列表
        """
        # 简化点赞数据，只保留内容和作者
        simplified_likes = []
        for t in likes:
            simplified_likes.append({
                "content": t.get("content"),     # 推文内容
                "author": t.get("authorName")    # 作者名称
            })

        # 构建兴趣分析提示词
        prompt = f"""
任务:
基于用户最近 Likes，分析用户的兴趣方向。

Likes 数据:
{json.dumps(simplified_likes, ensure_ascii=False, indent=2)}

输出格式 (JSON):
{{
  "interests": [
    {{
      "categoryId": "...", // 建议使用标准分类ID
      "confidence": 0.85,   // 置信度 (0-1)
      "keywords": ["AI", "SaaS", "React"],  // 相关关键词
      "reasoning": "..."    // 分析理由
    }}
  ],
  "recommendedKeywords": ["...", "..."]  // 推荐添加的关键词
}}

要求:
- 至少识别 3 个兴趣方向
- 按 confidence 降序排列
- 提取 5-10 个高频关键词
"""

        try:
            # 调用 Claude API 进行兴趣分析
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.2,  # 稍高的温度以获得更多样化的输出
                system="You are a user interest analysis expert.",
                messages=[{"role": "user", "content": prompt}]
            )

            # 提取并解析响应
            content = message.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            return json.loads(content)

        except Exception as e:
            # 发生错误时返回空结果
            print(f"提取兴趣时出错: {e}")
            return {"interests": [], "recommendedKeywords": []}
