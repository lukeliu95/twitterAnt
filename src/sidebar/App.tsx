import { useEffect } from 'react';
import { StatusBar } from './components/StatusBar';
import { CategoryTabs } from './components/CategoryTabs';
import { SignalCard } from './components/SignalCard';
import { useStore } from './store';
import { DEFAULT_CATEGORIES } from '../types';
import { DUMMY_SIGNALS } from './dummyData';

function App() {
  const { 
    signals, 
    ui, 
    setSignals, 
    setScanning, 
    setActiveCategory, 
    updateSignal 
  } = useStore();

  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

    if (isExtension) {
      // Load from storage
      chrome.storage.local.get(['signals'], (result) => {
        if (result.signals) {
          setSignals(result.signals);
        }
      });

      // Listen for updates
      const listener = (message: any) => {
        if (message.type === 'SIGNALS_UPDATED') {
          setSignals(message.data);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    } else {
      // Dev mode: Load dummy data
      console.log('Dev mode: Loading dummy data');
      setSignals(DUMMY_SIGNALS);
      setScanning(true);
    }
  }, []);

  const filteredSignals = ui.activeCategory === 'all' 
    ? signals 
    : signals.filter(s => s.category === ui.activeCategory);

  const categoryCounts = DEFAULT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = signals.filter(s => s.category === cat.id).length;
    return acc;
  }, { all: signals.length } as Record<string, number>);

  const handleFeedback = (signalId: string, feedback: 'useful' | 'not_interested' | 'wrong') => {
    updateSignal(signalId, { userFeedback: feedback });
    // TODO: Sync to storage
  };

  const handleBookmark = (signalId: string) => {
    const signal = signals.find(s => s.signalId === signalId);
    if (signal) {
      updateSignal(signalId, { bookmarked: !signal.bookmarked });
      // TODO: Sync to storage
    }
  };

  const handleOpenTweet = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
      <StatusBar 
        isScanning={ui.isScanning}
        scannedCount={ui.scannedCount}
        signalCount={signals.length}
        onSettingsClick={() => console.log('Settings clicked')}
      />

      <CategoryTabs 
        categories={DEFAULT_CATEGORIES}
        activeCategory={ui.activeCategory}
        counts={categoryCounts}
        onCategoryChange={setActiveCategory}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p>暂无信号</p>
            <p className="text-xs">请稍候或切换分类</p>
          </div>
        ) : (
          filteredSignals.map(signal => (
            <SignalCard 
              key={signal.signalId}
              signal={signal}
              onFeedback={handleFeedback}
              onBookmark={handleBookmark}
              onOpenTweet={handleOpenTweet}
            />
          ))
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-border-color p-3 flex justify-between items-center text-xs text-text-secondary">
        <button className="hover:text-accent-color">刷新雷达</button>
        <button className="hover:text-text-primary">清空已读</button>
      </div>
    </div>
  );
}

export default App;
