import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import { SnackbarProvider } from 'notistack';
import { MaterialSymbol } from './components/MaterialSymbol';

// Import Rehrig theme
import { getRehrigTheme } from './theme/rehrigTheme';

// Import context
import { ADConnectionProvider } from './context/ADConnectionContext';

// Import components
import ADConnectionStatus from './components/ADConnectionStatus';
import ErrorBoundary from './components/ErrorBoundary';

// Import pages
import Dashboard from './pages/Dashboard';
import ADHelper from './pages/ADHelper';
import JiraUpdater from './pages/JiraUpdater';
import Settings from './pages/Settings';

const drawerWidth = 240;

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const theme = getRehrigTheme(darkMode ? 'dark' : 'light');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', symbolIcon: 'dashboard' },
    { id: 'adhelper', label: 'AD Helper', symbolIcon: 'group' },
    { id: 'jira', label: 'Jira Updater', symbolIcon: 'assignment' },
    { id: 'settings', label: 'Settings', symbolIcon: 'settings' },
  ];

  const drawer = (
    <div>
      {/* Branded Sidebar Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #0536B6 0%, #003063 100%)',  // Rehrig Blue to Navy
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'white',
              width: 56,
              height: 56,
              border: '3px solid rgba(255, 255, 255, 0.3)',
              p: 0.5,
            }}
            src="/logo.png"
            alt="Rehrig Pacific"
          >
            ADH
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} noWrap>
              ADHelper
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Rehrig IT Tools
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentPage === item.id}
              onClick={() => setCurrentPage(item.id)}
            >
              <ListItemIcon>
                    <MaterialSymbol icon={item.symbolIcon} filled={currentPage === item.id} size={24} />
                  </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'adhelper':
        return <ADHelper />;
      case 'jira':
        return <JiraUpdater />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={5000}
        preventDuplicate
      >
      <ADConnectionProvider>
        <CssBaseline />
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MaterialSymbol icon="menu" />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </Typography>

              {/* AD Connection Status Indicator */}
              <Box sx={{ mr: 2 }}>
                <ADConnectionStatus variant="chip" showRefresh={true} />
              </Box>

              <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
                {darkMode ? <MaterialSymbol icon="light_mode" /> : <MaterialSymbol icon="dark_mode" />}
              </IconButton>
            </Toolbar>
          </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8,
            overflow: 'auto',
          }}
        >
          <Box sx={{ flexGrow: 1, p: 3 }}>
            <ErrorBoundary sectionName={menuItems.find(i => i.id === currentPage)?.label || 'Page'}>
              {renderPage()}
            </ErrorBoundary>
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              py: 2,
              px: 3,
              mt: 'auto',
              borderTop: '1px solid',
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'light'
                ? 'rgba(5, 54, 182, 0.02)'
                : 'rgba(50, 131, 254, 0.05)',
            }}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              © 2026 Rehrig Pacific Company
            </Typography>
          </Box>
        </Box>
      </Box>
      </ADConnectionProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;

