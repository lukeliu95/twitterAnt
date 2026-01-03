import React, { useState } from 'react';
import { Signal, MatchReason } from '@/types';
import { ExternalLink, Bookmark, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  onFeedback: (signalId: string, feedback: 'useful' | 'not_interested' | 'wrong') => void;
  onBookmark: (signalId: string) => void;
  onOpenTweet: (url: string) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  onFeedback,
  onBookmark,
  onOpenTweet
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getReasonIcon = (type: MatchReason['type']) => {
    switch (type) {
      case 'keyword': return '🔑';
      case 'engagement': return '🔥';
      case 'timing': return '⏱️';
      case 'related_account': return '👥';
      default: return '•';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="bg-card-bg border border-border-color rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary text-sm">{signal.tweet.authorName}</span>
          <span className="text-xs text-text-tertiary">@{signal.tweet.authorHandle}</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
          signal.score >= 90 ? 'bg-green-100 text-green-700' :
          signal.score >= 80 ? 'bg-blue-100 text-blue-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {signal.score}
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2 bg-yellow-50/30 p-3 rounded-lg border border-yellow-200/50 mb-3">
        <Sparkles size={14} className="text-accent-color flex-shrink-0 mt-1" />
        <p className="text-sm text-text-secondary leading-snug">{signal.aiSummary}</p>
      </div>

      {/* Match Reasons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {signal.matchReasons.map((reason, idx) => (
          <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-tag-bg rounded text-xs text-text-secondary">
            <span>{getReasonIcon(reason.type)}</span>
            <span>{reason.value}</span>
          </div>
        ))}
      </div>

      {/* Tweet Preview (Expandable) */}
      <div className="border border-border-color rounded-md overflow-hidden mb-3">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-bg-secondary text-xs text-text-secondary hover:bg-hover-bg"
        >
          <span>查看原推文</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {isExpanded && (
          <div className="p-3 bg-white animate-in slide-in-from-top-1 duration-200">
            <p className="text-sm text-text-primary mb-2 whitespace-pre-wrap">{signal.tweet.content}</p>
            <div className="flex gap-4 text-xs text-text-tertiary">
              <span>❤️ {formatNumber(signal.tweet.engagement.likes)}</span>
              <span>🔄 {formatNumber(signal.tweet.engagement.retweets)}</span>
              <span>💬 {formatNumber(signal.tweet.engagement.replies)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-3">
        <button 
          onClick={() => onOpenTweet(signal.tweet.tweetUrl)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border-color rounded text-xs text-text-secondary hover:bg-hover-bg hover:text-accent-color transition-colors"
        >
          <ExternalLink size={14} />
          打开原文
        </button>
        <button 
          onClick={() => onBookmark(signal.signalId)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded text-xs transition-colors ${
            signal.bookmarked 
              ? 'bg-accent-light border-accent-color text-accent-color' 
              : 'border-border-color text-text-secondary hover:bg-hover-bg'
          }`}
        >
          <Bookmark size={14} fill={signal.bookmarked ? "currentColor" : "none"} />
          {signal.bookmarked ? '已收藏' : '收藏'}
        </button>
      </div>

      {/* Feedback */}
      <div className="flex gap-2 pt-3 border-t border-border-color">
        <button 
          onClick={() => onFeedback(signal.signalId, 'useful')}
          className={`flex-1 py-1 rounded text-xs border transition-colors ${
            signal.userFeedback === 'useful'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'border-transparent hover:bg-hover-bg text-text-tertiary'
          }`}
        >
          👍 有用
        </button>
        <button 
          onClick={() => onFeedback(signal.signalId, 'not_interested')}
          className={`flex-1 py-1 rounded text-xs border transition-colors ${
            signal.userFeedback === 'not_interested'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'border-transparent hover:bg-hover-bg text-text-tertiary'
          }`}
        >
          👎 无感
        </button>
        <button 
          onClick={() => onFeedback(signal.signalId, 'wrong')}
          className={`flex-1 py-1 rounded text-xs border transition-colors ${
            signal.userFeedback === 'wrong'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'border-transparent hover:bg-hover-bg text-text-tertiary'
          }`}
        >
          ⚠️ 误判
        </button>
      </div>
    </div>
  );
};
