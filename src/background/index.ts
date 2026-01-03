import { Tweet, Signal } from '../types';

console.log('TSF Background Service Started');

// Listen for action click (Toggle Sidebar)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Check if we can communicate with the tab first
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' })
      .catch((err) => {
        console.log('Failed to toggle sidebar, content script might not be ready:', err);
        // Optional: Inject content script if missing (advanced)
      });
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.type === 'ANALYZE_TWEETS') {
    analyzeTweets(message.data).then(signals => {
      if (signals.length > 0) {
        console.log('Found signals:', signals.length);
      }
      sendResponse({ success: true, count: signals.length });
    });
    return true; // Async response
  }

  if (message.type === 'EXTRACT_INTERESTS') {
    extractInterests(message.data).then(result => {
      sendResponse({ success: true, data: result });
    });
    return true; // Async response
  }

  if (message.type === 'START_LIKES_COLLECTION') {
    // 通知所有 Twitter/X 标签页开始自动滚动并显示侧边栏
    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          // 通知开始收集
          chrome.tabs.sendMessage(tab.id, {
            type: 'START_LIKES_COLLECTION'
          }).catch(() => {
            console.log('Failed to send start collection to tab:', tab.id);
          });

          // 通知显示侧边栏
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_SETTINGS_FOR_ANALYSIS'
          }).catch(() => {
            console.log('Failed to show sidebar on tab:', tab.id);
          });
        }
      });
    });

    // 通知侧边栏（iframe 内部）显示设置页面
    chrome.runtime.sendMessage({
      type: 'SHOW_SETTINGS_FOR_ANALYSIS'
    }).catch(() => {
      console.log('Failed to notify sidebar to show settings');
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'LIKES_COLLECTION_PROGRESS') {
    // 转发进度消息到侧边栏
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'LIKES_COLLECTION_COMPLETE') {
    // 转发完成消息到侧边栏
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
});

const API_BASE = 'http://localhost:3001';

async function analyzeTweets(tweets: Tweet[]): Promise<Signal[]> {
  try {
    // 1. Get User Profile (Mock for now, or from storage)
    const userProfile = await getUserProfile();

    // 2. Call Backend API
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweets: tweets,
        userProfile: userProfile
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    const signals = result.signals || [];

    if (signals.length > 0) {
      await saveSignals(signals);
      updateBadge(signals.length);
    }

    return signals;
  } catch (error) {
    console.error('Analysis failed:', error);
    return [];
  }
}

async function getUserProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userProfile', 'customKeywords'], (result) => {
      // Default profile if not set
      const defaultProfile = {
        persona: 'developer',
        interests: [
          { label: '趋势技术', enabled: true },
          { label: 'React', enabled: true }
        ],
        customKeywords: result.customKeywords || ['Agent', 'LLM']
      };
      resolve(result.userProfile || defaultProfile);
    });
  });
}

/**
 * 分析用户的 Likes，提取兴趣偏好
 */
async function extractInterests(likes: Tweet[]) {
  try {
    const response = await fetch(`${API_BASE}/api/extract-interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likes })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    // 保存兴趣分析结果
    if (result.interests && result.interests.length > 0) {
      // 转换为 Interest 格式
      const interests = result.interests.map((item: any) => ({
        categoryId: item.categoryId,
        label: item.categoryId, // 可以根据需要映射为更友好的名称
        weight: item.confidence,
        keywords: item.keywords || [],
        enabled: true
      }));

      await chrome.storage.local.set({
        interests,
        recommendedKeywords: result.recommendedKeywords || []
      });

      // 通知 UI 更新
      chrome.runtime.sendMessage({
        type: 'INTERESTS_UPDATED',
        data: {
          interests,
          recommendedKeywords: result.recommendedKeywords || []
        }
      }).catch(() => {
        // Sidebar might be closed, ignore
      });

      console.log('Interests extracted and saved:', interests);
    }

    return result;
  } catch (error) {
    console.error('Interest extraction failed:', error);
    return { interests: [], recommendedKeywords: [] };
  }
}

async function saveSignals(newSignals: Signal[]) {
  const result = await chrome.storage.local.get(['signals']);
  const existing: Signal[] = result.signals || [];

  // Merge and deduplicate
  const map = new Map(existing.map(s => [s.signalId, s]));
  const trulyNewSignals: Signal[] = [];

  newSignals.forEach(s => {
    if (!map.has(s.signalId)) {
      trulyNewSignals.push(s);
    }
    map.set(s.signalId, s);
  });

  const updated = Array.from(map.values());

  await chrome.storage.local.set({ signals: updated });

  // Notify sidebar UI
  chrome.runtime.sendMessage({
    type: 'SIGNALS_UPDATED',
    data: updated
  }).catch(() => {
    // Sidebar might be closed, ignore error
  });

  // Send new signals to content script for native indicators
  if (trulyNewSignals.length > 0) {
    // Get all Twitter tabs
    chrome.tabs.query({ url: '*://*.twitter.com/*' }, (twitterTabs) => {
      chrome.tabs.query({ url: '*://*.x.com/*' }, (xTabs) => {
        const allTabs = [...twitterTabs, ...xTabs];

        allTabs.forEach(tab => {
          const tabId = tab.id;
          if (tabId !== undefined) {
            trulyNewSignals.forEach(signal => {
              try {
                chrome.tabs.sendMessage(tabId, {
                  type: 'NEW_SIGNAL',
                  data: signal
                });
              } catch (e) {
                // Content script might not be ready, ignore
              }
            });
          }
        });
      });
    });
  }

  updateBadge(updated.length);
}

function updateBadge(count: number) {
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#d97706' });
}
