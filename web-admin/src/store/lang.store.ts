import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import en from '@/i18n/en.json';
import id from '@/i18n/id.json';

export type Lang = 'en' | 'id';

const TRANSLATIONS = { en, id };

interface LangState {
  lang:   Lang;
  t:      (key: string) => string;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      t: (key: string) => {
        const keys   = key.split('.');
        const dict   = TRANSLATIONS[get().lang] as any;
        let   result = dict;
        for (const k of keys) {
          result = result?.[k];
          if (result === undefined) return key; // fallback to key
        }
        return result ?? key;
      },
      setLang: (lang) => set({ lang }),
    }),
    {
      name:    'pasifik-lang',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);