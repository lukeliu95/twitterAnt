import React from 'react';
import { Signal } from '@/types';
import { ExternalLink, Sparkles } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  onOpenTweet: (url: string) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  onOpenTweet
}) => {
  return (
    <div className="bg-card-bg border border-border-color rounded-lg p-3 mb-3 hover:shadow-sm transition-shadow">
      {/* Score and Summary Header */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${
          signal.score >= 90 ? 'bg-green-100 text-green-700 border border-green-200' :
          signal.score >= 80 ? 'bg-blue-100 text-blue-700 border border-blue-200' :
          'bg-yellow-100 text-yellow-700 border border-yellow-200'
        }`}>
          {signal.score}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-accent-color" />
            <span className="text-[10px] font-bold text-accent-color uppercase tracking-wider">趋势信号</span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed line-clamp-3 mb-2">
            {signal.aiSummary}
          </p>
          
          <button 
            onClick={() => onOpenTweet(signal.tweet.tweetUrl)}
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent-color transition-colors"
          >
            <ExternalLink size={10} />
            查看原文
          </button>
        </div>
      </div>
    </div>
  );
};
