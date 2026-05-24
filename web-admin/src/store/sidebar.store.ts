import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SidebarMode = 'expanded' | 'collapsed' | 'hover';

interface SidebarState {
  mode:    SidebarMode;
  setMode: (mode: SidebarMode) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      mode:    'expanded',
      setMode: (mode) => set({ mode }),
    }),
    {
      name:    'pasifik-sidebar',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);