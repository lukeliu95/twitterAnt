import { create } from 'zustand';
import { Signal, UserProfile, Interest } from '../types';

interface UIState {
  isScanning: boolean;
  scannedCount: number;
  sidebarOpen: boolean;
  view: 'list' | 'settings' | 'focus';
  isAnalyzingInterests: boolean;  // 是否正在分析兴趣
}

interface AppState {
  signals: Signal[];
  userProfile: UserProfile | null;
  ui: UIState;
  interests: Interest[];           // 兴趣列表
  recommendedKeywords: string[];   // 推荐的关键词
  customKeywords: string[];        // 用户自定义关键词

  // Actions
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  updateSignal: (signalId: string, updates: Partial<Signal>) => void;
  setScanning: (isScanning: boolean) => void;
  incrementScannedCount: (count: number) => void;
  toggleSidebar: (isOpen: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
  setView: (view: 'list' | 'settings' | 'focus') => void;

  // 兴趣相关操作
  setInterests: (interests: Interest[]) => void;
  setRecommendedKeywords: (keywords: string[]) => void;
  setCustomKeywords: (keywords: string[]) => void;
  addCustomKeyword: (keyword: string) => void;
  removeCustomKeyword: (keyword: string) => void;
  updateInterest: (categoryId: string, updates: Partial<Interest>) => void;
  setAnalyzingInterests: (isAnalyzing: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  signals: [],
  userProfile: null,
  ui: {
    isScanning: false,
    scannedCount: 0,
    sidebarOpen: false,
    view: 'list',
    isAnalyzingInterests: false,
  },
  interests: [],
  recommendedKeywords: [],
  customKeywords: [],

  setSignals: (signals) => set({ signals }),

  addSignal: (signal) => set((state) => ({
    signals: [signal, ...state.signals]
  })),

  updateSignal: (signalId, updates) => set((state) => ({
    signals: state.signals.map((s) =>
      s.signalId === signalId ? { ...s, ...updates } : s
    )
  })),

  setScanning: (isScanning) => set((state) => ({
    ui: { ...state.ui, isScanning }
  })),

  incrementScannedCount: (count) => set((state) => ({
    ui: { ...state.ui, scannedCount: state.ui.scannedCount + count }
  })),

  toggleSidebar: (sidebarOpen) => set((state) => ({
    ui: { ...state.ui, sidebarOpen }
  })),

  setUserProfile: (userProfile) => set({ userProfile }),

  setView: (view) => set((state) => ({
    ui: { ...state.ui, view }
  })),

  // 兴趣相关操作实现
  setInterests: (interests) => set({ interests }),

  setRecommendedKeywords: (recommendedKeywords) => set({ recommendedKeywords }),

  setCustomKeywords: (customKeywords) => set({ customKeywords }),

  addCustomKeyword: (keyword) => set((state) => ({
    customKeywords: [...state.customKeywords, keyword]
  })),

  removeCustomKeyword: (keyword) => set((state) => ({
    customKeywords: state.customKeywords.filter(k => k !== keyword)
  })),

  updateInterest: (categoryId, updates) => set((state) => ({
    interests: state.interests.map(i =>
      i.categoryId === categoryId ? { ...i, ...updates } : i
    )
  })),

  setAnalyzingInterests: (isAnalyzingInterests) => set((state) => ({
    ui: { ...state.ui, isAnalyzingInterests }
  }))
}));
