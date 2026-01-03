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
      console.log('Interests extracted:', result);
      sendResponse({ success: true, interests: result });
    });
    return true; // Async response
  }
});

const API_BASE = 'http://localhost:3001';

async function extractInterests(likes: Tweet[]) {
  try {
    const response = await fetch(`${API_BASE}/api/extract-interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likes })
    });

    if (!response.ok) throw new Error('API Error');
    
    const result = await response.json();
    
    // Update user profile with new interests
    if (result.interests) {
       await updateUserInterests(result.interests);
    }
    
    return result;
  } catch (error) {
    console.error('Interest extraction failed:', error);
    return null;
  }
}

async function updateUserInterests(newInterests: any[]) {
  const profile: any = await getUserProfile();
  
  // Simple merge strategy: Add new interests if they don't exist
  // const currentLabels = new Set(profile.interests.map((i: any) => i.label));
  
  newInterests.forEach(interest => {
    // Assuming backend returns { categoryId, keywords, ... }
    // We map keywords to interests or categories
    // For simplicity, let's just add the keywords as custom keywords or new interest labels
    if (interest.keywords) {
        interest.keywords.forEach((k: string) => {
            if (!profile.customKeywords.includes(k)) {
                profile.customKeywords.push(k);
            }
        });
    }
  });

  await chrome.storage.sync.set({ userProfile: profile });
  console.log('User profile updated with new interests');
}

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
    chrome.storage.sync.get(['userProfile'], (result) => {
      // Default profile if not set
      const defaultProfile = {
        persona: 'developer',
        interests: [
          { label: 'AI', enabled: true },
          { label: 'React', enabled: true }
        ],
        customKeywords: ['Agent', 'LLM']
      };
      resolve(result.userProfile || defaultProfile);
    });
  });
}

async function saveSignals(newSignals: Signal[]) {
  const result = await chrome.storage.local.get(['signals']);
  const existing: Signal[] = result.signals || [];
  
  // Merge and deduplicate
  const map = new Map(existing.map(s => [s.signalId, s]));
  newSignals.forEach(s => map.set(s.signalId, s));
  
  const updated = Array.from(map.values());
  
  await chrome.storage.local.set({ signals: updated });
  
  // Notify UI
  chrome.runtime.sendMessage({
    type: 'SIGNALS_UPDATED',
    data: updated
  }).catch(() => {
    // Sidebar might be closed, ignore error
  });
}

function updateBadge(count: number) {
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#d97706' });
}
