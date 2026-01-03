import { create } from 'zustand';
import { Signal, UserProfile } from '../types';

interface UIState {
  isScanning: boolean;
  scannedCount: number;
  sidebarOpen: boolean;
  view: 'list' | 'settings';
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
  toggleSidebar: (isOpen: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
  setView: (view: 'list' | 'settings') => void;
}

export const useStore = create<AppState>((set) => ({
  signals: [],
  userProfile: null,
  ui: {
    isScanning: false,
    scannedCount: 0,
    sidebarOpen: false,
    view: 'list',
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

  toggleSidebar: (sidebarOpen) => set((state) => ({
    ui: { ...state.ui, sidebarOpen }
  })),

  setUserProfile: (userProfile) => set({ userProfile }),

  setView: (view) => set((state) => ({
    ui: { ...state.ui, view }
  }))
}));
