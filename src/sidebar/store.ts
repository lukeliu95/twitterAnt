import { create } from 'zustand';
import { Signal, UserProfile } from '../types';

interface UIState {
  isScanning: boolean;
  scannedCount: number;
  activeCategory: string;
  sidebarOpen: boolean;
}

interface AppState {
  signals: Signal[];
  userProfile: UserProfile | null;
  ui: UIState;
  
  // Actions
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  updateSignal: (signalId: string, updates: Partial<Signal>) => void;
  setScanning: (isScanning: boolean) => void;
  incrementScannedCount: (count: number) => void;
  setActiveCategory: (categoryId: string) => void;
  toggleSidebar: (isOpen: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
}

export const useStore = create<AppState>((set) => ({
  signals: [],
  userProfile: null,
  ui: {
    isScanning: false,
    scannedCount: 0,
    activeCategory: 'all',
    sidebarOpen: false,
  },

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

  setActiveCategory: (activeCategory) => set((state) => ({
    ui: { ...state.ui, activeCategory }
  })),

  toggleSidebar: (sidebarOpen) => set((state) => ({
    ui: { ...state.ui, sidebarOpen }
  })),

  setUserProfile: (userProfile) => set({ userProfile })
}));
