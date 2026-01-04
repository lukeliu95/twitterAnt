import { Tweet, Signal } from '../types';

console.log('TSF Background Service Started');

// 自动监控状态
let autoMonitoringEnabled = false;
let monitoringInterval: NodeJS.Timeout | null = null;

// 初始化时加载自动监控设置
chrome.storage.local.get(['tsfAutoMonitoring'], (result) => {
  if (result.tsfAutoMonitoring) {
    startAutoMonitoring();
  }
});

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

  // 处理时间线收集开始请求
  if (message.type === 'START_TIMELINE_COLLECTION') {
    // 保存是否需要自动启动专注模式的标志
    if (message.data?.autoStartFocusMode) {
      chrome.storage.local.set({ autoStartFocusMode: true });
    }

    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            console.log('Failed to send timeline collection to tab:', tab.id);
          });
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }

  // 处理时间线分析请求
  if (message.type === 'ANALYZE_TIMELINE_FOR_INTERESTS') {
    analyzeTimelineForInterests(message.data.tweets).then(result => {
      sendResponse({ success: true, data: result });
    });
    return true;
  }

  // 转发时间线收集进度
  if (message.type === 'TIMELINE_COLLECTION_PROGRESS') {
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  // 处理时间线收集完成
  if (message.type === 'TIMELINE_COLLECTION_COMPLETE') {
    chrome.storage.local.set({ timelineCollected: true });
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  // 处理时间线分析开始（来自 TimelinePromptManager）
  if (message.type === 'START_TIMELINE_ANALYSIS') {
    // 通知所有 Twitter/X 标签页开始收集和分析时间线
    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && (tab.url.includes('/home') || tab.url === 'https://x.com/' || tab.url === 'https://twitter.com/')) {
          // 只在主页的标签页执行
          chrome.tabs.sendMessage(tab.id, {
            type: 'START_TIMELINE_COLLECTION',
            data: { targetCount: 100 }
          }).catch(() => {
            console.log('Failed to start timeline analysis on tab:', tab.id);
          });
        }
      });
    });

    // 通知 TimelinePromptManager 分析开始
    chrome.runtime.sendMessage({
      type: 'TIMELINE_ANALYSIS_STARTED'
    }).catch(() => {});

    sendResponse({ success: true });
    return true;
  }

  // 处理显示侧边栏请求
  if (message.type === 'SHOW_SIDEBAR') {
    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_SIDEBAR',
            data: message.data || {}
          }).catch(() => {});
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }

  // 处理跳转到主页并开始分析的请求
  if (message.type === 'NAVIGATE_TO_HOME_AND_ANALYZE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        // 设置等待分析标志
        chrome.storage.local.set({ 
          pendingTimelineAnalysis: true,
          autoStartFocusMode: true 
        }, () => {
          // 跳转到主页
          chrome.tabs.update(activeTab.id!, { url: 'https://x.com/home' });
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // 开始时间线分析（由 content script 提示点击后触发）
  if (message.type === 'START_TIMELINE_ANALYSIS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        const tabId = activeTab.id;
        // 获取收集条数设置
        chrome.storage.local.get(['tsfCollectionCount'], (result) => {
          const targetCount = result.tsfCollectionCount || 100;
          chrome.tabs.sendMessage(tabId, {
            type: 'START_TIMELINE_COLLECTION',
            data: { targetCount }
          });
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // 启动自动监控
  if (message.type === 'START_AUTO_MONITORING') {
    startAutoMonitoring();
    sendResponse({ success: true });
    return true;
  }

  // 停止自动监控
  if (message.type === 'STOP_AUTO_MONITORING') {
    stopAutoMonitoring();
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
    const allScores = result.allScores || [];

    if (signals.length > 0) {
      await saveSignals(signals);
      updateBadge(signals.length);
    }

    if (allScores.length > 0) {
      // 存储所有评分，供专注模式使用
      await saveAllScores(allScores);
    }

    // 通知 TimelinePromptManager 分析完成
    chrome.runtime.sendMessage({
      type: 'TIMELINE_ANALYSIS_COMPLETE'
    }).catch(() => {});

    // 检查是否需要自动启动专注模式
    const autoStartResult = await new Promise<{ autoStartFocusMode: boolean }>((resolve) => {
      chrome.storage.local.get(['autoStartFocusMode'], (result) => {
        resolve({ autoStartFocusMode: result.autoStartFocusMode || false });
      });
    });

    if (autoStartResult.autoStartFocusMode) {
      console.log('TSF: Auto-starting focus mode after timeline analysis');
      // 清除标志
      chrome.storage.local.remove(['autoStartFocusMode']);

      // 启动专注模式
      chrome.storage.local.set({
        tsfFocusSettings: {
          mode: 'focused',
          threshold: 50,
          shiftKeyActive: false
        }
      });

      // 通知所有标签页应用专注模式，并暂停推文捕获
      chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            // 应用专注模式
            chrome.tabs.sendMessage(tab.id, {
              type: 'SET_FOCUS_MODE',
              data: {
                mode: 'focused',
                threshold: 50
              }
            }).catch(() => {});

            // 暂停推文捕获
            chrome.tabs.sendMessage(tab.id, {
              type: 'PAUSE_TWEET_CAPTURE'
            }).catch(() => {});
          }
        });
      });

      // 通知侧边栏切换到信号列表视图
      chrome.runtime.sendMessage({
        type: 'SWITCH_SIDEBAR_VIEW',
        data: { view: 'list' }
      }).catch(() => {});
    }

    return signals;
  } catch (error) {
    console.error('Analysis failed:', error);

    // 通知 TimelinePromptManager 分析完成（即使失败也通知）
    chrome.runtime.sendMessage({
      type: 'TIMELINE_ANALYSIS_COMPLETE'
    }).catch(() => {});

    return [];
  }
}

async function getUserProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userProfile', 'customKeywords', 'interests'], (result) => {
      // 从 interests 构建兴趣列表
      const interestsList = result.interests || [];
      const enabledInterests = interestsList
        .filter((i: any) => i.enabled)
        .map((i: any) => ({
          label: i.label || i.categoryId,
          enabled: true
        }));

      // Default profile if not set
      const defaultProfile = {
        persona: 'developer',
        interests: enabledInterests.length > 0 ? enabledInterests : [
          { label: '趋势技术', enabled: true },
          { label: 'React', enabled: true }
        ],
        customKeywords: result.customKeywords || []
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
        label: item.label || item.categoryId, // 优先使用 label，如果没有则用 categoryId
        weight: item.weight || item.confidence, // 支持 weight 和 confidence 两种字段
        keywords: item.keywords || [],
        enabled: true
      }));

      console.log('TSF: Converted interests for storage:', interests);

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

      console.log('TSF: Interests extracted and saved, sent INTERESTS_UPDATED message');

      // 兴趣分析完成后，自动触发时间线分析
      console.log('TSF: Auto-triggering timeline analysis after interest extraction');
      chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id && tab.url && (tab.url.includes('/home') || tab.url === 'https://x.com/' || tab.url === 'https://twitter.com/')) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'START_TIMELINE_COLLECTION',
              data: { targetCount: 100, autoStartFocusMode: true }
            }).catch(() => {
              console.log('TSF: Failed to start auto timeline analysis on tab:', tab.id);
            });
          }
        });
      });
    } else {
      console.log('TSF: No interests found in API result');
    }

    return result;
  } catch (error) {
    console.error('Interest extraction failed:', error);
    return { interests: [], recommendedKeywords: [] };
  }
}

/**
 * 快速分析时间线推文，提取兴趣偏好
 * 用于首次引导流程
 */
async function analyzeTimelineForInterests(timeline: Tweet[]) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweets: timeline })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    // 保存兴趣分析结果
    if (result.interests && result.interests.length > 0) {
      // 时间线分析返回的格式已经符合要求
      await chrome.storage.local.set({
        interests: result.interests,
        recommendedKeywords: result.recommendedKeywords || []
      });

      // 通知 UI 更新
      chrome.runtime.sendMessage({
        type: 'INTERESTS_UPDATED',
        data: {
          interests: result.interests,
          recommendedKeywords: result.recommendedKeywords || []
        }
      }).catch(() => {});

      console.log('Timeline interests analyzed and saved:', result.interests);
    }

    return result;
  } catch (error) {
    console.error('Timeline analysis failed:', error);
    return { interests: [], recommendedKeywords: [], analyzedCount: 0 };
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
    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        const tabId = tab.id;
        if (tabId) {
          trulyNewSignals.forEach(signal => {
            chrome.tabs.sendMessage(tabId, {
              type: 'NEW_SIGNAL',
              data: signal
            });
          });
        }
      });
    });
  }

  updateBadge(updated.length);
}

/**
 * 存储所有推文的评分（包括非信号推文）
 */
async function saveAllScores(scores: { tweetId: string, score: number }[]) {
  const result = await chrome.storage.local.get(['allTweetScores']);
  const existing = result.allTweetScores || {};
  
  // 更新评分
  scores.forEach(s => {
    existing[s.tweetId] = s.score;
  });
  
  await chrome.storage.local.set({ allTweetScores: existing });
  
  // 通知内容脚本更新评分
  chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
    tabs.forEach(tab => {
      const tabId = tab.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_TWEET_SCORES',
          data: existing
        });
      }
    });
  });
}

function updateBadge(count: number) {
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#d97706' });
}

/**
 * 启动自动监控
 * 定期检查是否有新推文需要分析
 */
function startAutoMonitoring() {
  if (autoMonitoringEnabled) {
    console.log('TSF: Auto monitoring already running');
    return;
  }

  console.log('TSF: Starting auto monitoring');
  autoMonitoringEnabled = true;

  // 通知所有 Twitter 标签页恢复推文捕获
  chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'RESUME_TWEET_CAPTURE'
        }).catch(() => {});
      }
    });
  });

  // 每 30 秒检查一次新推文（可以根据需要调整）
  monitoringInterval = setInterval(() => {
    checkForNewTweets();
  }, 30000); // 30 秒

  // 立即执行一次
  checkForNewTweets();
}

/**
 * 停止自动监控
 */
function stopAutoMonitoring() {
  console.log('TSF: Stopping auto monitoring');
  autoMonitoringEnabled = false;

  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  // 通知所有 Twitter 标签页暂停推文捕获
  chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'PAUSE_TWEET_CAPTURE'
        }).catch(() => {});
      }
    });
  });
}

/**
 * 检查新推文
 * 从 content script 获取最新的推文批次并分析
 */
async function checkForNewTweets() {
  if (!autoMonitoringEnabled) {
    return;
  }

  try {
    // 获取所有 Twitter/X 标签页
    chrome.tabs.query({ url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && (tab.url.includes('/home') || tab.url === 'https://x.com/' || tab.url === 'https://twitter.com/')) {
          // 只在主页标签页监控
          // content script 会自动收集新推文并发送到 background
          // 这里不需要额外操作，analyzeTweets 会自动处理
          console.log('TSF: Monitoring tab:', tab.id);
        }
      });
    });
  } catch (error) {
    console.error('TSF: Error checking for new tweets:', error);
  }
}
