import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SignalCard } from './components/SignalCard';
import { SettingsView } from './components/SettingsView';
import { OnboardingView } from './components/OnboardingView';
import { FocusModeView } from './components/FocusModeView';
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

  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

    if (isExtension) {
      // 检查是否已完成引导
      chrome.storage.local.get(['tsfOnboarded', 'signals'], (result) => {
        setHasOnboarded(result.tsfOnboarded || false);
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
        } else if (message.type === 'SHOW_ONBOARDING') {
          // 显示首次引导
          setHasOnboarded(false);
        } else if (message.type === 'SWITCH_SIDEBAR_VIEW') {
          // 切换侧边栏视图
          if (message.data.view) {
            setView(message.data.view);
          }
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

  // 首次引导完成
  const handleOnboardingComplete = () => {
    setHasOnboarded(true);
    setView('list');
  };

  const handleOnboardingSkip = () => {
    setHasOnboarded(true);
    setView('list');
  };

  // 如果未完成引导，显示引导页面
  if (!hasOnboarded) {
    return (
      <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
        <div className="onboarding-container">
          <Header onClose={handleClose} />
          <OnboardingView
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        </div>
      </div>
    );
  }

  // 专注模式视图
  if (ui.view === 'focus') {
    return (
      <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
        <Header
          onHomeClick={() => setView('list')}
          onSettingsClick={() => setView('settings')}
          onClose={handleClose}
        />
        <div className="flex-1 overflow-y-auto p-4">
          <FocusModeView
            onSettingsChange={(settings) => {
              // 同步到 content script
              chrome.runtime.sendMessage({
                type: 'SET_FOCUS_MODE',
                data: settings
              });
            }}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // 设置视图
  if (ui.view === 'settings') {
    return <SettingsView onBack={() => setView('list')} />;
  }

  // 主视图（信号列表）
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
      <Header
        onSettingsClick={() => setView('settings')}
        onFocusModeClick={() => setView('focus')}
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
