import { useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SignalCard } from './components/SignalCard';
import { SettingsView } from './components/SettingsView';
import { useStore } from './store';
import { DUMMY_SIGNALS } from './dummyData';

function App() {
  const {
    signals,
    ui,
    setSignals,
    setScanning,
    updateSignal,
    setView,
    setInterests,
    setRecommendedKeywords,
    setAnalyzingInterests
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
        } else if (message.type === 'INTERESTS_UPDATED') {
          // 更新兴趣数据
          setInterests(message.data.interests);
          setRecommendedKeywords(message.data.recommendedKeywords);
          setAnalyzingInterests(false);
        } else if (message.type === 'SHOW_SETTINGS_FOR_ANALYSIS') {
          // 自动切换到设置页面显示分析进度
          setView('settings');
          setAnalyzingInterests(true);
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

  const handleClose = () => {
    // Communicate with parent window (content script)
    window.parent.postMessage({
      type: 'CLOSE_SIDEBAR',
      source: 'tsf-sidebar'
    }, '*');
  };

  // Input area logic removed
  
  if (ui.view === 'settings') {
    return <SettingsView onBack={() => setView('list')} />;
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
      <Header 
        onSettingsClick={() => setView('settings')}
        onClose={handleClose}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p>暂无信号</p>
            <p className="text-xs">等待分析...</p>
          </div>
        ) : (
          signals.map(signal => (
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

      <Footer />
    </div>
  );
}

export default App;
