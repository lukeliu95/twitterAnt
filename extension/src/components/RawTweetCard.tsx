/**
 * RawTweetCard - 原始推文卡片组件
 *
 * 显示尚未完成 AI 分析的推文
 */

import { useState } from 'react';
import { formatNumber, SIGNAL_TYPE_LABELS, type RawTweet } from '../shared/types/raw-tweet';
import './RawTweetCard.css';

interface RawTweetCardProps {
  rawTweet: RawTweet;
}

export function RawTweetCard({ rawTweet }: RawTweetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { tweetData, status, predictedType } = rawTweet;

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return `${Math.floor(diffMins / 1440)}天前`;
  };

  // 获取状态显示
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending_analysis':
        return { text: '等待分析', icon: '⏳', className: 'pending' };
      case 'analyzing':
        return { text: 'AI 分析中...', icon: '🔄', className: 'analyzing' };
      case 'completed':
        return { text: '分析完成', icon: '✅', className: 'completed' };
      case 'failed':
        return { text: '分析失败', icon: '❌', className: 'failed' };
      default:
        return { text: '未知状态', icon: '❓', className: 'unknown' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="raw-tweet-card">
      {/* Header */}
      <div className="raw-tweet-header">
        <div className="raw-tweet-header-left">
          {predictedType && (
            <span className="predicted-type-badge">
              {SIGNAL_TYPE_LABELS[predictedType]}
            </span>
          )}
          <span className={`status-badge ${statusDisplay.className}`}>
            {statusDisplay.icon} {statusDisplay.text}
          </span>
        </div>
        <div className="raw-tweet-header-right">
          <span className="timestamp">{formatTime(tweetData.timestamp)}</span>
        </div>
      </div>

      {/* Author */}
      <div className="tweet-author">
        <div className="author-info">
          <span className="author-name">{tweetData.author.displayName}</span>
          {tweetData.author.verified && (
            <span className="verified-badge">✓</span>
          )}
        </div>
        <div className="author-username">@{tweetData.author.username}</div>
      </div>

      {/* Content */}
      <div className="tweet-content">
        <p
          className="tweet-text"
          onClick={() => !expanded && setExpanded(!expanded)}
          style={{ cursor: expanded ? 'default' : 'pointer' }}
        >
          {expanded ? tweetData.text : (tweetData.text.length > 150
            ? tweetData.text.slice(0, 150) + '...'
            : tweetData.text)}
        </p>

        {tweetData.media && tweetData.media.length > 0 && (
          <div className="tweet-media">
            {tweetData.media.map((mediaUrl, idx) => (
              <img key={idx} src={mediaUrl} alt="Media" className="tweet-media-item" />
            ))}
          </div>
        )}
      </div>

      {/* Engagement */}
      <div className="tweet-engagement">
        <div className="engagement-item">
          <span className="engagement-icon">💬</span>
          <span className="engagement-count">{formatNumber(tweetData.engagement.replies)}</span>
        </div>
        <div className="engagement-item">
          <span className="engagement-icon">🔄</span>
          <span className="engagement-count">{formatNumber(tweetData.engagement.retweets)}</span>
        </div>
        <div className="engagement-item">
          <span className="engagement-icon">❤️</span>
          <span className="engagement-count">{formatNumber(tweetData.engagement.likes)}</span>
        </div>
        {tweetData.engagement.views > 0 && (
          <div className="engagement-item">
            <span className="engagement-icon">👁️</span>
            <span className="engagement-count">{formatNumber(tweetData.engagement.views)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="raw-tweet-footer">
        <a
          href={tweetData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="view-tweet-link"
        >
          查看原推文 →
        </a>
      </div>

      {/* Analyzing Animation */}
      {status === 'analyzing' && (
        <div className="analyzing-animation">
          <div className="dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      )}
    </div>
  );
}
