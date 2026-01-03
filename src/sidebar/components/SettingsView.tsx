import React from 'react';
import { ChevronLeft, Heart, Search } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const handleAnalyzeLikes = () => {
    // Open likes page in new tab
    // Prefer stored handle if available, fallback to i/likes
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['currentUserHandle'], (result) => {
        const handle = result.currentUserHandle;
        const url = handle ? `https://x.com/${handle}/likes` : 'https://x.com/i/likes';
        window.open(url, '_blank');
      });
    } else {
      window.open('https://x.com/i/likes', '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-color">
        <button 
          onClick={onBack}
          className="p-1 -ml-1 rounded hover:bg-hover-bg text-text-secondary transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-text-primary">设置</h2>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Interest Analysis Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-accent-color">
            <Heart size={18} />
            <h3 className="font-medium">兴趣分析</h3>
          </div>
          
          <div className="bg-card-bg border border-border-color rounded-lg p-4 space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              TSF 可以通过分析你最近喜欢的推文，自动提取你的兴趣关键词，从而更精准地发现高价值信号。
            </p>
            
            <div className="text-xs text-text-tertiary bg-bg-secondary p-3 rounded space-y-1">
              <p>我们将分析：</p>
              <ul className="list-disc list-inside">
                <li>最近 7 天的 Likes 数据</li>
                <li>最多 100 条推文</li>
              </ul>
            </div>

            <button
              onClick={handleAnalyzeLikes}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-color text-white rounded-md font-medium hover:bg-accent-hover transition-colors shadow-sm"
            >
              <Search size={16} />
              前往 Likes 页面开始分析
            </button>
            
            <p className="text-xs text-center text-text-tertiary">
              点击按钮将打开 Likes 页面，分析会自动在后台进行。
            </p>
          </div>
        </section>

        {/* Other settings can go here */}
      </div>
    </div>
  );
};
