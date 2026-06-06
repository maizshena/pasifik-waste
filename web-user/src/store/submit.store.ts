import { create } from 'zustand';

interface SubmitState {
  isDirty:    boolean;
  setDirty:   (dirty: boolean) => void;
  clearDirty: () => void;
}

export const useSubmitStore = create<SubmitState>()((set) => ({
  isDirty:    false,
  setDirty:   (dirty) => set({ isDirty: dirty }),
  clearDirty: ()      => set({ isDirty: false }),
}));