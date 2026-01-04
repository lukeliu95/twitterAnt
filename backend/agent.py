"""
# 趋势信号 (Trend Signal Free - TSF) - AI 信号分析代理

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
        # 调试：打印推文数据
        print(f"[DEBUG] 收到 {len(tweets)} 条推文")
        for i, t in enumerate(tweets[:3]):  # 只打印前3条
            print(f"[DEBUG] 推文 {i+1}: tweetId={t.get('tweetId')}, content长度={len(t.get('content', ''))}")
            print(f"[DEBUG] 推文 {i+1} 内容预览: {t.get('content', '')[:100]}")

        # 过滤掉没有内容的推文
        valid_tweets = [t for t in tweets if t.get('content', '').strip()]
        if len(valid_tweets) < len(tweets):
            print(f"[DEBUG] 过滤掉 {len(tweets) - len(valid_tweets)} 条空内容推文")

        if not valid_tweets:
            print("[DEBUG] 所有推文都没有内容，返回空结果")
            return {"signals": [], "allScores": []}

        # 构建分析提示词
        prompt = self._construct_analysis_prompt(valid_tweets, user_profile)

        # 调试：打印 prompt 长度
        print(f"[DEBUG] 构建的 prompt 长度: {len(prompt)} 字符")

        try:
            model_name = str(self.model) if self.model else "claude-3-5-sonnet-20241022"
            message = self.client.messages.create(
                model=model_name,              # type: ignore
                max_tokens=3072,  # 增加到 3072 以支持详细输出
                temperature=0,
                system="你是一个资深的社交媒体内容分析专家。",
                messages=[{"role": "user", "content": prompt}]
            )

            # 获取响应文本
            content = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    content += getattr(block, 'text', "")  # type: ignore

            print(f"推文分析 API 响应长度: {len(content)} 字符")

            # 检查响应是否为空
            if not content or content.strip() == "":
                print("警告: 推文分析 API 返回空响应")
                return {"signals": [], "allScores": []}

            # 提取 JSON（处理可能的 markdown 代码块）
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            else:
                # 如果没有代码块，尝试提取 JSON 对象
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end > 0:
                    content = content[start:end]

            # 尝试解析 JSON
            try:
                result = json.loads(content)
                signals_count = len(result.get('signals', []))
                scores_count = len(result.get('allScores', []))
                print(f"成功解析推文分析 JSON: {signals_count} 个信号, {scores_count} 条评分")
                return result
            except json.JSONDecodeError as je:
                print(f"推文分析 JSON 解析失败: {je}")
                print(f"尝试解析的内容:\n{content}")
                return {"signals": [], "allScores": []}

        except Exception as e:
            # 发生错误时返回空信号列表
            print(f"分析推文时出错: {type(e).__name__}: {e}")
            import traceback
            print(f"详细错误信息:\n{traceback.format_exc()}")
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

        # 构建完整的提示词 - 详细版（用于推文卡片展示）
        return f"""用户信息:
- 身份: {user_profile.get('persona', 'unknown')}
- 关注领域: {', '.join([i['label'] for i in user_profile.get('interests', []) if i.get('enabled')])}
- 自定义关键词: {', '.join(user_profile.get('customKeywords', []))}

任务:
分析以下推文，判断它们对用户的价值并评分。为高价值推文提供详细解读。

推文列表:
{json.dumps(simplified_tweets, ensure_ascii=False, indent=2)}

输出格式 (JSON) - 详细版:
{{
  "signals": [
    {{
      "tweetId": "...",
      "isValuable": true,
      "category": "技术/产品/趋势",
      "score": 85,
      "aiSummary": "一句话概括（20字以内）",
      "detailedExplanation": "详细解读这条推文的内容和价值（2-3句话）",
      "whyItMatters": "为什么值得关注（1-2句话）",
      "keyInsights": [
        "关键洞察点 1",
        "关键洞察点 2"
      ],
      "matchReasons": [
        {{
          "type": "keyword",
          "value": "具体关键词",
          "weight": 0.85
        }}
      ]
    }}
  ],
  "allScores": [
    {{"tweetId": "...", "score": 85}},
    {{"tweetId": "...", "score": 20}}
  ]
}}

评分标准:
1. 关键词匹配度 (40%)
2. 内容质量 (30%)
3. 互动热度 (20%)
4. 时间新鲜度 (10%)

注意事项:
- signals 列表中只返回 score >= 70 的高价值信号
- allScores 列表中返回**所有**推文的评分 (0-100)
- aiSummary 简短（20字以内），detailedExplanation 详细（2-3句）
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
            # 使用配置的模型或默认值
            model_name = str(self.model) if self.model else "claude-3-5-sonnet-20241022"

            # 调用 Claude API 进行兴趣分析
            message = self.client.messages.create(
                model=model_name,              # type: ignore
                max_tokens=12800,
                temperature=0.2,  # 稍高的温度以获得更多样化的输出
                system="You are a user interest analysis expert.",
                messages=[{"role": "user", "content": prompt}]
            )

            # 提取并解析响应
            content = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    content += getattr(block, 'text', "")  # type: ignore

            # 记录原始响应用于调试
            print(f"兴趣分析 API 响应长度: {len(content)} 字符")
            print(f"兴趣分析 API 响应前 200 字符: {content[:200]}")

            # 检查响应是否为空
            if not content or content.strip() == "":
                print("警告: 兴趣分析 API 返回空响应")
                return {"interests": [], "recommendedKeywords": []}

            # 提取 JSON（如果有代码块包装）
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            # 尝试解析 JSON
            try:
                result = json.loads(content)
                interests_count = len(result.get('interests', []))
                keywords_count = len(result.get('recommendedKeywords', []))
                print(f"成功解析兴趣分析 JSON: {interests_count} 个兴趣, {keywords_count} 个关键词")
                return result
            except json.JSONDecodeError as je:
                print(f"兴趣分析 JSON 解析失败: {je}")
                print(f"尝试解析的内容:\n{content}")
                return {"interests": [], "recommendedKeywords": []}

        except Exception as e:
            # 发生错误时返回空结果
            print(f"提取兴趣时出错: {type(e).__name__}: {e}")
            import traceback
            print(f"详细错误信息:\n{traceback.format_exc()}")
            return {"interests": [], "recommendedKeywords": []}

    def analyze_timeline_for_interests(self, timeline: List[Dict]) -> Dict:
        """
        快速分析时间线推文，提取兴趣偏好
        专为首次引导设计，比 extract_interests 更快

        参数:
            timeline: 时间线推文列表

        返回:
            Dict: 包含兴趣分析结果的字典
        """
        # 简化推文数据
        simplified_timeline = []
        for t in timeline[:100]:  # 最多分析100条
            simplified_timeline.append({
                "content": t.get("content", "")[:500],  # 限制长度
                "author": t.get("authorName", "")
            })

        # 构建快速分析提示词
        prompt = f"""
任务:
快速分析用户时间线，识别主要的兴趣方向。

时间线数据 ({len(simplified_timeline)} 条):
{json.dumps(simplified_timeline, ensure_ascii=False, indent=2)}

输出格式 (JSON):
{{
  "interests": [
    {{
      "categoryId": "tech_ai",
      "label": "AI 技术",
      "confidence": 0.85,
      "keywords": ["Claude", "GPT", "LLM"],
      "enabled": true
    }}
  ],
  "recommendedKeywords": ["Agent", "RAG", "Fine-tuning"]
}}

要求:
- 快速识别 3-5 个主要兴趣方向
- confidence 范围 0.5-1.0
- 每个兴趣提供 3-5 个关键词
- 推荐添加 5-8 个关键词
"""

        try:
            # 使用配置的模型或默认值
            model_name = str(self.model) if self.model else "claude-3-5-sonnet-20241022"
            
            # 调用 Claude API
            message = self.client.messages.create(
                model=model_name,              # type: ignore
                max_tokens=12800,
                temperature=0.3,
                system="You are a quick content analysis expert. Identify main topics efficiently.",
                messages=[{"role": "user", "content": prompt}]
            )

            # 提取并解析响应
            content = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    content += getattr(block, 'text', "")  # type: ignore

            print(f"时间线分析响应长度: {len(content)} 字符")

            # 提取 JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            try:
                result = json.loads(content)
                interests_count = len(result.get('interests', []))
                keywords_count = len(result.get('recommendedKeywords', []))
                print(f"成功分析时间线: {interests_count} 个兴趣, {keywords_count} 个关键词")
                return result
            except json.JSONDecodeError as je:
                print(f"JSON 解析失败: {je}")
                print(f"尝试解析的内容:\n{content}")
                return {"interests": [], "recommendedKeywords": []}

        except Exception as e:
            print(f"时间线分析出错: {type(e).__name__}: {e}")
            import traceback
            print(f"详细错误:\n{traceback.format_exc()}")
            return {"interests": [], "recommendedKeywords": []}
