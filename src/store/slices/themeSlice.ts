import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
}

// Helper para aplicar o tema ao document
const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

// Obter tema inicial e aplicar
const getInitialTheme = (): Theme => {
  const savedTheme = localStorage.getItem('ivijur_theme') as Theme;
  const theme = savedTheme || 'light'; // Padrão light em vez de system
  
  // Aplicar tema inicial ao document
  applyTheme(theme);
  
  return theme;
};

const initialState: ThemeState = {
  theme: getInitialTheme(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      localStorage.setItem('ivijur_theme', action.payload);
      applyTheme(action.payload);
    },
    
    toggleTheme: (state) => {
      // Se for system, obter o tema atual do sistema e alternar
      let currentTheme = state.theme;
      
      if (currentTheme === 'system') {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      
      // Alternar entre light e dark
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      localStorage.setItem('ivijur_theme', newTheme);
      applyTheme(newTheme);
    },
  },
});

// Actions
export const { setTheme, toggleTheme } = themeSlice.actions;

// Selectors
export const selectTheme = (state: { theme: ThemeState }) => state.theme.theme;

export default themeSlice.reducer;


