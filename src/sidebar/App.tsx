import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SettingsView } from './components/SettingsView';
import { OnboardingView } from './components/OnboardingView';
import { FocusModeView } from './components/FocusModeView';
import { useStore } from './store';

function App() {
  const {
    ui,
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
      chrome.storage.local.get(['tsfOnboarded'], (result) => {
        setHasOnboarded(result.tsfOnboarded || false);
      });

      // Listen for updates
      const listener = (message: any) => {
        if (message.type === 'INTERESTS_UPDATED') {
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
          // 切换侧边栏视图 - 'list' 视图重定向到 'focus'
          if (message.data.view) {
            const targetView = message.data.view === 'list' ? 'focus' : message.data.view;
            setView(targetView);
          }
        }
      };
      chrome.runtime.onMessage.addListener(listener);

      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
  }, []);

  const handleClose = () => {
    // Communicate with parent window (content script)
    window.parent.postMessage({
      type: 'CLOSE_SIDEBAR',
      source: 'tsf-sidebar'
    }, '*');
  };

  // 首次引导完成 - 默认显示专注模式
  const handleOnboardingComplete = () => {
    setHasOnboarded(true);
    setView('focus');
  };

  const handleOnboardingSkip = () => {
    setHasOnboarded(true);
    setView('focus');
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

  // 专注模式视图（默认主页）
  if (ui.view === 'focus') {
    return (
      <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
        <Header
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
    return <SettingsView onBack={() => setView('focus')} />;
  }

  // 默认显示专注模式
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden font-sans text-sm">
      <Header
        onSettingsClick={() => setView('settings')}
        onClose={handleClose}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <FocusModeView
          onSettingsChange={(settings) => {
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

export default App;
