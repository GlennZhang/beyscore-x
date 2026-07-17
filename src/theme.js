import { createTheme } from '@mui/material/styles';

// Dynamic Beyblade-inspired theme: red / black / yellow.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#E63946' },
    secondary: { main: '#FFD23F' },
    background: { default: '#121212', paper: '#1E1E1E' },
    success: { main: '#4CAF50' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
});

export default theme;
