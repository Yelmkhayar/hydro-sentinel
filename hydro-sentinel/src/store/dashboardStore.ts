import { create } from 'zustand';

interface DashboardState {
  selectedBasinId: string | null;
  selectedDateRange: { from: Date; to: Date } | null;
  setSelectedBasinId: (id: string | null) => void;
  setSelectedDateRange: (range: { from: Date; to: Date } | null) => void;
  mapDisplayMode: 'severity' | 'precip' | 'debit' | 'volume';
  setMapDisplayMode: (mode: 'severity' | 'precip' | 'debit' | 'volume') => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedBasinId: null,
  selectedDateRange: null,
  mapDisplayMode: 'severity',
  setSelectedBasinId: (id) => set({ selectedBasinId: id }),
  setSelectedDateRange: (range) => set({ selectedDateRange: range }),
  setMapDisplayMode: (mode) => set({ mapDisplayMode: mode }),
}));
