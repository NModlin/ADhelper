import { useState, useCallback, useEffect } from 'react';
import { ThemeProvider, alpha } from '@mui/material/styles';
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
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
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

// Sidebar dimensions
const DRAWER_EXPANDED = 260;
const DRAWER_COLLAPSED = 72;

// Navigation groups with badge support
export interface NavItem {
  id: string;
  label: string;
  symbolIcon: string;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', symbolIcon: 'dashboard' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'adhelper', label: 'AD Helper', symbolIcon: 'group' },
      { id: 'jira', label: 'Jira Updater', symbolIcon: 'assignment' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', symbolIcon: 'settings' },
    ],
  },
];

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const theme = getRehrigTheme(darkMode ? 'dark' : 'light');

  // Effective sidebar width considering collapse + hover
  const showExpanded = !sidebarCollapsed || hoverExpanded;
  const sidebarWidth = showExpanded ? DRAWER_EXPANDED : DRAWER_COLLAPSED;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
    setHoverExpanded(false);
  }, []);

  // Keyboard shortcut: Ctrl+B toggles sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Find current page label for AppBar title
  const currentLabel =
    navGroups.flatMap((g) => g.items).find((i) => i.id === currentPage)?.label ?? 'Dashboard';

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'adhelper':
        return <ADHelper />;
      case 'jira':
        return <JiraUpdater />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // ── Sidebar drawer content ───────────────────────────────────────────
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Branded header */}
      <Box
        sx={{
          p: showExpanded ? 2.5 : 1.5,
          background: 'linear-gradient(135deg, #0536B6 0%, #003063 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: showExpanded ? 2 : 0,
          justifyContent: showExpanded ? 'flex-start' : 'center',
          minHeight: 72,
          transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'white',
            width: showExpanded ? 44 : 36,
            height: showExpanded ? 44 : 36,
            border: '2px solid rgba(255,255,255,0.3)',
            p: 0.5,
            transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
          }}
          src="/logo.png"
          alt="Rehrig Pacific"
        >
          ADH
        </Avatar>
        {showExpanded && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              ADHelper
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
              Rehrig IT Tools
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {navGroups.map((group, gi) => (
          <Box key={group.label}>
            {gi > 0 && <Divider sx={{ mx: 2, my: 0.5 }} />}
            {/* Group label — only when expanded */}
            {showExpanded && (
              <Typography
                variant="overline"
                sx={{
                  px: 3,
                  pt: 1.5,
                  pb: 0.5,
                  display: 'block',
                  color: 'text.disabled',
                  fontSize: '0.625rem',
                  letterSpacing: '0.1em',
                }}
              >
                {group.label}
              </Typography>
            )}
            <List disablePadding>
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                const iconEl = (
                  <Badge
                    badgeContent={item.badge ?? 0}
                    color="secondary"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 18, height: 18 } }}
                  >
                    <MaterialSymbol
                      icon={item.symbolIcon}
                      filled={isActive}
                      size={24}
                      color={isActive ? theme.palette.primary.main : undefined}
                    />
                  </Badge>
                );

                return (
                  <ListItem key={item.id} disablePadding sx={{ px: 1 }}>
                    <Tooltip title={showExpanded ? '' : item.label} placement="right" arrow>
                      <ListItemButton
                        selected={isActive}
                        onClick={() => setCurrentPage(item.id)}
                        sx={{
                          minHeight: 44,
                          borderRadius: 2,
                          justifyContent: showExpanded ? 'initial' : 'center',
                          px: showExpanded ? 2 : 1.5,
                          ...(isActive && {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.18),
                            },
                          }),
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: showExpanded ? 2 : 0,
                            justifyContent: 'center',
                          }}
                        >
                          {iconEl}
                        </ListItemIcon>
                        {showExpanded && (
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isActive ? 600 : 400,
                              noWrap: true,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Collapse toggle at bottom */}
      <Divider />
      <Box sx={{ p: 1, display: 'flex', justifyContent: showExpanded ? 'flex-end' : 'center' }}>
        <Tooltip title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'} placement="right" arrow>
          <IconButton onClick={toggleSidebar} size="small" aria-label="Toggle sidebar">
            <MaterialSymbol
              icon={sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              size={20}
            />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

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
            {/* AppBar */}
            <AppBar
              position="fixed"
              sx={{
                width: { sm: `calc(100% - ${sidebarWidth}px)` },
                ml: { sm: `${sidebarWidth}px` },
                transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1), margin 0.3s cubic-bezier(0.2, 0, 0, 1)',
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
                  {currentLabel}
                </Typography>
                <Box sx={{ mr: 2 }}>
                  <ADConnectionStatus variant="chip" showRefresh={true} />
                </Box>
                <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
                  {darkMode ? <MaterialSymbol icon="light_mode" /> : <MaterialSymbol icon="dark_mode" />}
                </IconButton>
              </Toolbar>
            </AppBar>

            {/* Sidebar nav */}
            <Box
              component="nav"
              sx={{
                width: { sm: sidebarWidth },
                flexShrink: { sm: 0 },
                transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              {/* Mobile temporary drawer */}
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_EXPANDED },
                }}
              >
                {drawerContent}
              </Drawer>

              {/* Desktop permanent drawer */}
              <Drawer
                variant="permanent"
                open
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  '& .MuiDrawer-paper': {
                    boxSizing: 'border-box',
                    width: sidebarWidth,
                    transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1)',
                    overflowX: 'hidden',
                    borderRight: (t) =>
                      `1px solid ${t.palette.mode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                  },
                }}
                onMouseEnter={() => {
                  if (sidebarCollapsed) setHoverExpanded(true);
                }}
                onMouseLeave={() => {
                  setHoverExpanded(false);
                }}
              >
                {drawerContent}
              </Drawer>
            </Box>

            {/* Main content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                width: { sm: `calc(100% - ${sidebarWidth}px)` },
                mt: 8,
                overflow: 'auto',
                transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              <Box sx={{ flexGrow: 1, p: 3 }}>
                <ErrorBoundary sectionName={currentLabel}>
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
                  background: (t) =>
                    t.palette.mode === 'light'
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

