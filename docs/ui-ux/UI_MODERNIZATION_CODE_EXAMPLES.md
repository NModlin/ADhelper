# ADHelper UI Modernization - Code Examples

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [Rehrig Brand UI Guide](REHRIG_BRAND_UI_GUIDE.md), [Official Colors](OFFICIAL_REHRIG_COLORS.md)

## 🎨 Example 1: Modern Theme Configuration

### Create: `src/renderer/theme/theme.ts`

```typescript
import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#0066CC' : '#90CAF9',
      light: mode === 'light' ? '#4D94FF' : '#BBDEFB',
      dark: mode === 'light' ? '#004C99' : '#64B5F6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'light' ? '#6750A4' : '#CDB4DB',
      light: mode === 'light' ? '#9A82DB' : '#E5D9F2',
      dark: mode === 'light' ? '#4A3780' : '#9A82DB',
    },
    background: {
      default: mode === 'light' ? '#F5F7FA' : '#121212',
      paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
    },
    text: {
      primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
      secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.60)' : 'rgba(255, 255, 255, 0.60)',
    },
    success: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    warning: {
      main: '#F57C00',
      light: '#FF9800',
      dark: '#E65100',
    },
    info: {
      main: '#0288D1',
      light: '#03A9F4',
      dark: '#01579B',
    },
  },
  typography: {
    fontFamily: [
      'Inter Variable',
      'Segoe UI Variable',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 2px 4px rgba(0,0,0,0.06)',
    '0 4px 8px rgba(0,0,0,0.08)',
    '0 8px 16px rgba(0,0,0,0.10)',
    '0 16px 32px rgba(0,0,0,0.12)',
    '0 24px 48px rgba(0,0,0,0.15)',
    '0 32px 64px rgba(0,0,0,0.18)',
    '0 40px 80px rgba(0,0,0,0.20)',
    '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
    '0 20px 40px rgba(0,0,0,0.2)',
    '0 25px 50px rgba(0,0,0,0.25)',
    '0 30px 60px rgba(0,0,0,0.3)',
    '0 35px 70px rgba(0,0,0,0.35)',
    '0 40px 80px rgba(0,0,0,0.4)',
    '0 45px 90px rgba(0,0,0,0.45)',
    '0 50px 100px rgba(0,0,0,0.5)',
    '0 2px 4px -1px rgba(0,0,0,0.2), 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)',
    '0 3px 5px -1px rgba(0,0,0,0.2), 0 5px 8px 0 rgba(0,0,0,0.14), 0 1px 14px 0 rgba(0,0,0,0.12)',
    '0 4px 5px -2px rgba(0,0,0,0.2), 0 7px 10px 1px rgba(0,0,0,0.14), 0 2px 16px 1px rgba(0,0,0,0.12)',
    '0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12)',
    '0 6px 6px -3px rgba(0,0,0,0.2), 0 10px 14px 1px rgba(0,0,0,0.14), 0 4px 18px 3px rgba(0,0,0,0.12)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0 2px 8px rgba(0,0,0,0.08)' 
            : '0 2px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme(getDesignTokens(mode));
};
```

### Usage in Dashboard:

```typescript
import { StatCard } from '../components/common/StatCard';
import PeopleIcon from '@mui/icons-material/People';

<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={3}>
    <StatCard
      title="Users Processed Today"
      value={42}
      icon={<PeopleIcon fontSize="large" />}
      color="primary"
      trend={{ value: 12, direction: 'up' }}
      onClick={() => navigate('/adhelper')}
    />
  </Grid>
</Grid>
```

---

## 🔔 Example 3: Toast Notification System

### Install Package:

```bash
npm install notistack
```

### Update: `src/renderer/App.tsx`

```typescript
import { SnackbarProvider } from 'notistack';

function App() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      autoHideDuration={5000}
      preventDuplicate
    >
      <ThemeProvider theme={theme}>
        {/* ... rest of app */}
      </ThemeProvider>
    </SnackbarProvider>
  );
}
```

### Create: `src/renderer/hooks/useNotification.ts`

```typescript
import { useSnackbar, VariantType } from 'notistack';
import { Button } from '@mui/material';

export const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showNotification = (
    message: string,
    variant: VariantType = 'default',
    options?: {
      persist?: boolean;
      action?: React.ReactNode;
    }
  ) => {
    return enqueueSnackbar(message, {
      variant,
      ...options,
    });
  };

  const showSuccess = (message: string) => {
    return showNotification(message, 'success');
  };

  const showError = (message: string, retry?: () => void) => {
    return showNotification(message, 'error', {
      persist: true,
      action: (key) => (
        <>
          {retry && (
            <Button size="small" onClick={() => {
              closeSnackbar(key);
              retry();
            }}>
              Retry
            </Button>
          )}
          <Button size="small" onClick={() => closeSnackbar(key)}>
            Dismiss
          </Button>
        </>
      ),
    });
  };

  const showWarning = (message: string) => {
    return showNotification(message, 'warning');
  };

  const showInfo = (message: string) => {
    return showNotification(message, 'info');
  };

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
```

### Usage in Components:

```typescript
import { useNotification } from '../hooks/useNotification';

const ADHelper: React.FC = () => {
  const { showSuccess, showError } = useNotification();

  const handleProcessUser = async () => {
    try {
      await processUser(username);
      showSuccess('User processed successfully!');
    } catch (error) {
      showError('Failed to process user', () => handleProcessUser());
    }
  };
};
```

---

## 🎭 Example 4: Loading States with Skeletons

### Create: `src/renderer/components/common/DashboardSkeleton.tsx`

```typescript
import React from 'react';
import { Grid, Card, CardContent, Skeleton, Box } from '@mui/material';

export const DashboardSkeleton: React.FC = () => {
  return (
    <Box>
      <Skeleton variant="text" width={300} height={48} sx={{ mb: 2 }} />
      <Skeleton variant="text" width={500} height={24} sx={{ mb: 4 }} />

      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 2 }} />
                </Box>
                <Skeleton variant="text" width="60%" height={48} />
                <Skeleton variant="text" width="80%" height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

### Usage:

```typescript
const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadDashboardData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Box>
      {/* Actual dashboard content */}
    </Box>
  );
};
```

---

## 🎨 Example 5: Modern Sidebar Navigation

### Create: `src/renderer/components/layout/Sidebar.tsx`

```typescript
import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Typography,
  Badge,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  navGroups: NavGroup[];
  currentPage: string;
  onNavigate: (pageId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ navGroups, currentPage, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  const theme = useTheme();
  const sidebarWidth = expanded ? 280 : 72;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.7)} 0%, ${alpha(theme.palette.background.default, 0.5)} 100%)`
            : theme.palette.background.paper,
          backdropFilter: 'blur(20px)',
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {expanded && (
          <Typography variant="h6" fontWeight={600}>
            ADHelper
          </Typography>
        )}
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      <Divider />

      {navGroups.map((group, groupIndex) => (
        <Box key={groupIndex}>
          {expanded && (
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                display: 'block',
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {group.label}
            </Typography>
          )}

          <List>
            {group.items.map((item) => (
              <ListItem key={item.id} disablePadding>
                <Tooltip title={!expanded ? item.label : ''} placement="right">
                  <ListItemButton
                    selected={currentPage === item.id}
                    onClick={() => onNavigate(item.id)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.18),
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: expanded ? 40 : 'auto' }}>
                      <Badge badgeContent={item.badge} color="error">
                        {item.icon}
                      </Badge>
                    </ListItemIcon>
                    {expanded && <ListItemText primary={item.label} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>

          {groupIndex < navGroups.length - 1 && <Divider sx={{ my: 1 }} />}
        </Box>
      ))}
    </Drawer>
  );
};
```

---

## 📈 Example 6: Data Visualization with Charts

### Install Package:

```bash
npm install recharts
```

### Create: `src/renderer/components/charts/UsageChart.tsx`

```typescript
import React from 'react';
import { Card, CardContent, Typography, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface UsageChartProps {
  data: Array<{
    date: string;
    users: number;
    tickets: number;
  }>;
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  const theme = useTheme();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Usage Over Time
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.3} />
                <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />

            <XAxis
              dataKey="date"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: 12 }}
            />

            <YAxis
              stroke={theme.palette.text.secondary}
              style={{ fontSize: 12 }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
                boxShadow: theme.shadows[4],
              }}
            />

            <Area
              type="monotone"
              dataKey="users"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              fill="url(#colorUsers)"
            />

            <Area
              type="monotone"
              dataKey="tickets"
              stroke={theme.palette.secondary.main}
              strokeWidth={2}
              fill="url(#colorTickets)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

---

## 🚀 Quick Implementation Checklist

### Day 1: Foundation
- [ ] Create `src/renderer/theme/theme.ts`
- [ ] Update `App.tsx` to use new theme
- [ ] Add Inter Variable font to `index.html`
- [ ] Install notistack: `npm install notistack`
- [ ] Wrap app with SnackbarProvider

### Day 2: Components
- [ ] Create `src/renderer/components/common/StatCard.tsx`
- [ ] Create `src/renderer/hooks/useNotification.ts`
- [ ] Create `src/renderer/components/common/DashboardSkeleton.tsx`
- [ ] Install react-countup: `npm install react-countup`

### Day 3: Dashboard
- [ ] Update Dashboard.tsx to use StatCard
- [ ] Add loading state with DashboardSkeleton
- [ ] Replace Alert components with toast notifications
- [ ] Add hover effects to cards

### Day 4: Navigation
- [ ] Create `src/renderer/components/layout/Sidebar.tsx`
- [ ] Update App.tsx to use new Sidebar
- [ ] Add collapsible functionality
- [ ] Add navigation groups

### Day 5: Charts
- [ ] Install recharts: `npm install recharts`
- [ ] Create UsageChart component
- [ ] Add charts to Dashboard
- [ ] Create mock data for visualization

---

**Result:** After 5 days, you'll have a significantly modernized application with professional aesthetics and improved UX!

### Update: `src/renderer/App.tsx`

```typescript
import { createAppTheme } from './theme/theme';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);
  
  return (
    <ThemeProvider theme={theme}>
      {/* ... rest of app */}
    </ThemeProvider>
  );
}
```

---

## 📊 Example 2: Enhanced StatCard Component

### Create: `src/renderer/components/common/StatCard.tsx`

```typescript
import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CountUp from 'react-countup';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  onClick,
}) => {
  const theme = useTheme();
  const isClickable = !!onClick;

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': isClickable ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[12],
        } : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.palette[color].main}, ${theme.palette[color].light})`,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: theme.palette[color].main,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
          
          {trend && (
            <Chip
              label={`${trend.direction === 'up' ? '+' : ''}${trend.value}%`}
              size="small"
              color={trend.direction === 'up' ? 'success' : 'error'}
              icon={trend.direction === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        
        <Typography variant="h3" fontWeight={600} gutterBottom>
          {typeof value === 'number' ? (
            <CountUp end={value} duration={2} separator="," />
          ) : (
            value
          )}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};
```


