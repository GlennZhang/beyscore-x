import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Container,
  Box,
} from '@mui/material';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ToysIcon from '@mui/icons-material/Toys';
import HistoryIcon from '@mui/icons-material/History';

const TABS = [
  { key: 'battle', label: '对战', icon: <SportsKabaddiIcon /> },
  { key: 'parts', label: '图鉴', icon: <MenuBookIcon /> },
  { key: 'beys', label: '我的陀螺', icon: <ToysIcon /> },
  { key: 'history', label: '历史', icon: <HistoryIcon /> },
];

/**
 * App shell: top AppBar + bottom mobile-friendly navigation.
 */
export default function Layout({ tab, setTab, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="primary" elevation={2}>
        <Toolbar>
          <SportsKabaddiIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            BEYSCORE <Box component="span" sx={{ color: 'secondary.main' }}>X</Box>
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ flex: 1, py: 2, pb: 11 }}>
        {children}
      </Container>

      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(event, newValue) => setTab(newValue)}
          sx={{ bgcolor: 'background.paper' }}
        >
          {TABS.map((t) => (
            <BottomNavigationAction
              key={t.key}
              label={t.label}
              icon={t.icon}
              value={t.key}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
