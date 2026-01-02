from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import SignalAgent
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

agent = SignalAgent()

@app.route('/api/analyze', methods=['POST'])
def analyze_tweets():
    data = request.json
    tweets = data.get('tweets', [])
    user_profile = data.get('userProfile', {})
    
    if not tweets:
        return jsonify({"signals": [], "metadata": {"processedCount": 0}})

    try:
        result = agent.analyze_tweets(tweets, user_profile)
        
        # Add metadata and format response
        signals = result.get('signals', [])
        
        # Enrich signals with original tweet data if needed, 
        # or ensure the structure matches what frontend expects
        enriched_signals = []
        for s in signals:
            # Find original tweet
            original_tweet = next((t for t in tweets if t['tweetId'] == s['tweetId']), None)
            if original_tweet:
                enriched_signals.append({
                    "signalId": f"sig_{s['tweetId']}", # Simple ID generation
                    "tweetId": s['tweetId'],
                    "category": s.get('category', 'trending'),
                    "score": s.get('score', 0),
                    "aiSummary": s.get('aiSummary', ''),
                    "matchReasons": s.get('matchReasons', []),
                    "tweet": original_tweet,
                    "bookmarked": False,
                    "read": False,
                    "detectedAt": original_tweet.get('capturedAt') # Use captured time or now
                })

        return jsonify({
            "signals": enriched_signals,
            "metadata": {
                "processedCount": len(tweets),
                "signalCount": len(enriched_signals),
                "avgScore": 0, # Calculate if needed
                "processingTime": "0s" # Calculate if needed
            }
        })
        
    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/extract-interests', methods=['POST'])
def extract_interests():
    data = request.json
    likes = data.get('likes', [])
    
    if not likes:
        return jsonify({"interests": [], "recommendedKeywords": []})
        
    try:
        result = agent.extract_interests(likes)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    # Mock implementation for feedback
    # In a real app, this would update a database or user profile weights
    data = request.json
    return jsonify({
        "success": True,
        "updatedWeights": {
            # Mock return
            "tech_products": 0.85,
            "business_startup": 0.60
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
