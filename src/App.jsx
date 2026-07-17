import React, { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import BattlePage from './components/BattlePage';
import PartsPage from './components/PartsPage';
import MyBeybladesPage from './components/MyBeybladesPage';
import HistoryPage from './components/HistoryPage';

/**
 * Beyscore X — root component.
 * Sets up the MUI theme, global state provider, and tab-based navigation.
 */
export default function App() {
  const [tab, setTab] = useState('battle');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Layout tab={tab} setTab={setTab}>
          {tab === 'battle' && <BattlePage />}
          {tab === 'parts' && <PartsPage />}
          {tab === 'beys' && <MyBeybladesPage />}
          {tab === 'history' && <HistoryPage />}
        </Layout>
      </AppProvider>
    </ThemeProvider>
  );
}
