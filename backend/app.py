"""
趋势信号 (Twitter Ant) - Flask API 服务器

这个模块提供 RESTful API 接口，用于：
1. 分析推文并返回趋势信号
2. 从用户的点赞记录中提取兴趣偏好
3. 接收用户反馈以优化推荐算法
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import SignalAgent
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 创建 Flask 应用实例
app = Flask(__name__)

# 启用 CORS（跨域资源共享），允许前端扩展调用 API
CORS(app)

# 创建信号分析代理实例
agent = SignalAgent()


@app.route('/api/analyze', methods=['POST'])
def analyze_tweets():
    """
    推文分析 API 端点

    接收推文列表和用户画像，使用 AI 分析并返回高价值信号
    """
    # 获取请求数据
    data = request.json
    tweets = data.get('tweets', [])           # 推文列表
    user_profile = data.get('userProfile', {}) # 用户画像

    # 记录请求信息
    print(f"[API] /api/analyze 收到请求: {len(tweets)} 条推文")
    print(f"[API] 用户画像: persona={user_profile.get('persona')}, interests={len(user_profile.get('interests', []))}")

    # 如果没有推文，返回空结果
    if not tweets:
        print("[API] 警告: 收到空推文列表")
        return jsonify({
            "signals": [],
            "metadata": {"processedCount": 0}
        })

    try:
        # 调用 AI 代理分析推文
        print(f"[API] 开始调用 AI 分析...")
        result = agent.analyze_tweets(tweets, user_profile)
        print(f"[API] AI 分析完成")

        # 提取信号列表
        signals = result.get('signals', [])
        print(f"[API] 发现 {len(signals)} 个信号")

        # 丰富信号数据，添加完整的推文信息
        enriched_signals = []
        for s in signals:
            # 查找对应的原始推文数据
            original_tweet = next(
                (t for t in tweets if t['tweetId'] == s['tweetId']),
                None
            )

            if original_tweet:
                # 构建完整的信号对象
                enriched_signals.append({
                    "signalId": f"sig_{s['tweetId']}",  # 生成唯一信号ID
                    "tweetId": s['tweetId'],
                    "score": s.get('score', 0),                 # 评分
                    "aiSummary": s.get('aiSummary', ''),         # AI 摘要
                    "detailedExplanation": s.get('detailedExplanation', ''),    # 详细解读
                    "whyItMatters": s.get('whyItMatters', ''),                  # 为什么值得关注
                    "keyInsights": s.get('keyInsights', []),                     # 关键洞察
                    "matchReasons": s.get('matchReasons', []),    # 匹配原因
                    "tweet": original_tweet,                        # 原始推文数据
                    "bookmarked": False,                            # 是否已收藏
                    "read": False,                                  # 是否已读
                    "detectedAt": original_tweet.get('capturedAt') # 检测时间
                })

        print(f"[API] 成功返回 {len(enriched_signals)} 个信号")

        # 返回分析结果
        return jsonify({
            "signals": enriched_signals,
            "metadata": {
                "processedCount": len(tweets),           # 处理的推文数量
                "signalCount": len(enriched_signals),     # 发现的信号数量
                "avgScore": 0,                            # 平均分（可选）
                "processingTime": "0s"                    # 处理时间（可选）
            }
        })

    except Exception as e:
        # 发生错误时返回错误信息
        import traceback
        print(f"[API] 错误: {type(e).__name__}: {e}")
        print(f"[API] 详细错误:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/extract-interests', methods=['POST'])
def extract_interests():
    """
    兴趣提取 API 端点

    分析用户的点赞记录，提取兴趣偏好和推荐关键词
    """
    # 获取请求数据
    data = request.json
    likes = data.get('likes', [])  # 用户点赞的推文列表

    # 记录请求信息
    print(f"[API] /api/extract-interests 收到请求: {len(likes)} 条 likes")

    # 如果没有点赞数据，返回空结果
    if not likes:
        print("[API] 警告: 收到空 likes 列表")
        return jsonify({
            "interests": [],
            "recommendedKeywords": []
        })

    try:
        # 调用 AI 代理提取兴趣
        print(f"[API] 开始调用 AI 提取兴趣...")
        result = agent.extract_interests(likes)
        interests_count = len(result.get('interests', []))
        keywords_count = len(result.get('recommendedKeywords', []))
        print(f"[API] 兴趣提取完成: {interests_count} 个兴趣, {keywords_count} 个关键词")
        return jsonify(result)

    except Exception as e:
        # 发生错误时返回错误信息
        import traceback
        print(f"[API] 兴趣提取错误: {type(e).__name__}: {e}")
        print(f"[API] 详细错误:\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/feedback', methods=['POST'])
def feedback():
    """
    用户反馈 API 端点

    接收用户对信号的反馈（有用/无感/误判），用于优化推荐算法

    请求体:
        {
            "signalId": "sig_123456",
            "feedback": "useful",  // 'useful' | 'not_interested' | 'wrong'
            "userId": "user_123"
        }

    返回:
        {
            "success": true,
            "updatedWeights": {
                "tech_products": 0.85,
                "business_startup": 0.60
            }
        }

    注意: 这是一个模拟实现。在实际应用中，应该：
          - 将反馈存储到数据库
          - 更新用户画像的权重
          - 可能触发重新训练推荐模型
    """
    # 获取反馈数据
    data = request.json

    # 模拟反馈处理
    # TODO: 在实际应用中实现以下逻辑：
    # 1. 验证用户身份
    # 2. 将反馈保存到数据库
    # 3. 更新用户兴趣权重
    # 4. 可能触发在线学习更新模型

    return jsonify({
        "success": True,
        "updatedWeights": {
            # 模拟返回的更新权重
            "tech_products": 0.85,
            "business_startup": 0.60
        }
    })


if __name__ == '__main__':
    """
    启动 Flask 开发服务器

    生产环境建议使用 Gunicorn 或 uWSGI 等 WSGI 服务器
    """
    # 从环境变量获取端口，默认为 3001
    port = int(os.getenv('PORT', 3001))

    # 启动服务器
    # host='0.0.0.0' 允许外部访问
    # debug=True 在开发模式下启用调试和热重载
    app.run(host='0.0.0.0', port=port, debug=True)
