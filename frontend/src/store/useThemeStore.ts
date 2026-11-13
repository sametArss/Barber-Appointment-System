import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const applyThemeToDOM = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeToDOM(next);
        set({ theme: next });
      },
    }),
    {
      name: 'barberbooking-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        }
      },
    },
  ),
);

// Initialize on page load
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('barberbooking-theme');
  let current: Theme = 'dark';
  try {
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme === 'light') current = 'light';
    }
  } catch {
    // fallback
  }
  applyThemeToDOM(current);
}

