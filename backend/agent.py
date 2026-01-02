import os
import json
from typing import List, Dict, Any
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

class SignalAgent:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = os.getenv("ANTHROPIC_MODEL")

    def analyze_tweets(self, tweets: List[Dict], user_profile: Dict) -> Dict:
        """
        Analyze tweets and return high-value signals based on user profile.
        """
        
        # Construct the prompt
        prompt = self._construct_analysis_prompt(tweets, user_profile)
        
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=0,
                system="You are a professional Twitter content analysis assistant. Your goal is to filter noise and identify high-value information for the user.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Extract JSON from response
            content = message.content[0].text
            # Helper to extract JSON if Claude wraps it in markdown blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
            
        except Exception as e:
            print(f"Error analyzing tweets: {e}")
            return {"signals": []}

    def _construct_analysis_prompt(self, tweets: List[Dict], user_profile: Dict) -> str:
        # Simplify tweets for prompt to save tokens
        simplified_tweets = []
        for t in tweets:
            simplified_tweets.append({
                "id": t.get("tweetId"),
                "author": t.get("authorName"),
                "content": t.get("content"),
                "metrics": t.get("engagement")
            })

        return f"""
用户信息:
- 身份: {user_profile.get('persona', 'unknown')}
- 关注领域: {', '.join([i['label'] for i in user_profile.get('interests', []) if i.get('enabled')])}
- 自定义关键词: {', '.join(user_profile.get('customKeywords', []))}

任务:
分析以下推文，判断它们是否对用户有价值，并生成洞察摘要。

推文列表:
{json.dumps(simplified_tweets, ensure_ascii=False, indent=2)}

输出格式 (JSON):
{{
  "signals": [
    {{
      "tweetId": "...",
      "isValuable": true,
      "category": "...",  // 从预设分类中选择: tech_products, business_startup, monetization, data_insights, skills_learning, opinions, trending
      "score": 85,        // 0-100, 只返回 >= 70 的
      "aiSummary": "...",   // 一句话摘要 (20-30字)
      "matchReasons": [
        {{
          "type": "keyword", // keyword, engagement, timing, related_account
          "value": "具体关键词",
          "weight": 0.85
        }}
      ]
    }}
  ]
}}

评分标准:
1. 关键词匹配度 (40%)
2. 内容质量 (30%)
3. 互动热度 (20%)
4. 时间新鲜度 (10%)

注意事项:
- 只返回 score >= 70 的高价值信号
- 摘要要简洁、有洞察力
- 关键词匹配要准确
- 考虑用户的个性化偏好
- 必须输出合法的 JSON 格式
"""

    def extract_interests(self, likes: List[Dict]) -> Dict:
        # Implementation for interest extraction (spec 7.2)
        simplified_likes = []
        for t in likes:
            simplified_likes.append({
                "content": t.get("content"),
                "author": t.get("authorName")
            })
            
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
      "confidence": 0.85,
      "keywords": ["AI", "SaaS", "React"],
      "reasoning": "..."
    }}
  ],
  "recommendedKeywords": ["...", "..."]
}}

要求:
- 至少识别 3 个兴趣方向
- 按 confidence 降序排列
- 提取 5-10 个高频关键词
"""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.2,
                system="You are a user interest analysis expert.",
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = message.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
        except Exception as e:
            print(f"Error extracting interests: {e}")
            return {"interests": [], "recommendedKeywords": []}
