# ADHelper UI Modernization - Rehrig Brand Guidelines

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [Rehrig Brand UI Guide](REHRIG_BRAND_UI_GUIDE.md), [Official Colors](OFFICIAL_REHRIG_COLORS.md)

## 🏢 Brand Context

**Organization:** Rehrig Pacific Company  
**Domains:** rehrig.com, rehrigpenn.com, rehrigpacific.com  
**AD Domain:** RPL.LOCAL  
**Application:** ADHelper - Internal IT Administration Tool

---

## 🎨 Official Rehrig Pacific Brand Colors

### Primary Brand Colors (Official)

Based on Rehrig Pacific Company's official brand guidelines:

#### Official Color Palette
```typescript
// Official Rehrig Colors
primary: {
  main: '#0536B6',      // Rehrig Blue Primary (Official)
  light: '#3283FE',     // Rehrig Light Blue (Pantone 2727 C)
  dark: '#003063',      // Rehrig Navy
  contrastText: '#FFFFFF',
}

secondary: {
  main: '#FFC20E',      // Rehrig Yellow (Official)
  light: '#FFD04D',     // Lighter yellow for accents
  dark: '#E6AD00',      // Darker yellow for depth
  contrastText: '#003063', // Navy text on yellow
}

// Additional Brand Colors
tertiary: {
  main: '#555570',      // Rehrig Gray Dark
  light: '#7A7A8F',
  dark: '#3A3A4A',
}
```

#### Light Mode Configuration
```typescript
palette: {
  mode: 'light',
  primary: {
    main: '#0536B6',      // Rehrig Blue Primary
    light: '#3283FE',     // Rehrig Light Blue
    dark: '#003063',      // Rehrig Navy
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FFC20E',      // Rehrig Yellow
    light: '#FFD04D',
    dark: '#E6AD00',
    contrastText: '#003063',
  },
  background: {
    default: '#F5F7FA',   // Soft gray background
    paper: '#FFFFFF',     // Pure white for cards
  },
}
```

#### Dark Mode Configuration
```typescript
palette: {
  mode: 'dark',
  primary: {
    main: '#3283FE',      // Lighter blue for dark mode
    light: '#5CA3FF',
    dark: '#0536B6',      // Original blue for depth
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FFC20E',      // Yellow stays consistent
    light: '#FFD04D',
    dark: '#E6AD00',
    contrastText: '#003063',
  },
  background: {
    default: '#0D1117',   // Deep dark background
    paper: '#161B22',     // Elevated dark surface
  },
}
```

#### Brand Gradients
```typescript
// Electric Blue Gradient (Official)
background: 'linear-gradient(90deg, #0536B6 0%, #3283FE 100%)',

// Alternative gradients
blueToNavy: 'linear-gradient(135deg, #0536B6 0%, #003063 100%)',
blueToYellow: 'linear-gradient(135deg, #0536B6 0%, #FFC20E 100%)',
```

### Semantic Colors (Consistent across themes)
```typescript
success: {
  main: '#27AE60',      // Green for successful operations
  light: '#2ECC71',
  dark: '#1E8449',
}

warning: {
  main: '#F39C12',      // Orange for warnings
  light: '#F1C40F',
  dark: '#D68910',
}

error: {
  main: '#C0392B',      // Red for errors
  light: '#E74C3C',
  dark: '#922B21',
}

info: {
  main: '#2980B9',      // Blue for informational messages
  light: '#3498DB',
  dark: '#1F618D',
}
```

### Background & Surface Colors

**Light Mode:**
```typescript
background: {
  default: '#F5F7FA',   // Soft gray background
  paper: '#FFFFFF',     // Pure white for cards
  elevated: '#FAFBFC',  // Slightly elevated surfaces
}

text: {
  primary: 'rgba(0, 0, 0, 0.87)',
  secondary: 'rgba(0, 0, 0, 0.60)',
  disabled: 'rgba(0, 0, 0, 0.38)',
}
```

**Dark Mode:**
```typescript
background: {
  default: '#0D1117',   // Deep dark background
  paper: '#161B22',     // Elevated dark surface
  elevated: '#1C2128',  // Higher elevation
}

text: {
  primary: 'rgba(255, 255, 255, 0.87)',
  secondary: 'rgba(255, 255, 255, 0.60)',
  disabled: 'rgba(255, 255, 255, 0.38)',
}
```

---

## 🏷️ Branding Elements

### Application Name
**Current:** ADHelper  
**Full Name:** ADHelper - Active Directory & Jira Manager  
**Tagline:** "Streamline user onboarding and IT operations"

### Logo Recommendations
Since no logo exists, consider:
1. **Monogram:** "ADH" or "RH" (Rehrig Helper)
2. **Icon Style:** Geometric, professional, minimal
3. **Colors:** Use primary brand blue with white/gray
4. **Format:** SVG for scalability

### Typography (Official Rehrig Fonts)

#### Primary Font: ITC Avant Garde Gothic Pro
**Usage:** Brand headings, marketing materials, primary branding
```typescript
fontFamily: [
  'ITC Avant Garde Gothic Pro',  // Official Rehrig brand font
  'Avant Garde',                  // Fallback
  'Century Gothic',               // Similar fallback
  'sans-serif',
].join(','),
```

#### Office Font: Franklin Gothic
**Usage:** Microsoft Office documents (Word, PowerPoint, Excel)
```typescript
fontFamily: [
  'Franklin Gothic',
  'Franklin Gothic Medium',
  'Arial',                        // Fallback
  'sans-serif',
].join(','),
```

#### Web/Application Font: Poppins + Inter
**Usage:** Web applications, digital interfaces (ADHelper)
```typescript
fontFamily: [
  'Poppins',                      // Official Rehrig web font
  'Inter',                        // Modern fallback
  'Segoe UI',                     // Windows native
  '-apple-system',
  'system-ui',
  'sans-serif',
].join(','),
```

**Recommended for ADHelper:** Use **Poppins** as primary with **Inter** as fallback

**Font Weights:**
- Regular (400): Body text, general content
- Medium (500): Subheadings, buttons, emphasis
- Semi-Bold (600): Section headings
- Bold (700): Main headings, strong emphasis

**Installation:**
```html
<!-- Add to index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 🎯 Brand-Specific UI Components

### 1. Branded Header/Hero Section

```typescript
// Dashboard hero with Official Rehrig branding
<Paper
  sx={{
    p: 4,
    background: 'linear-gradient(90deg, #0536B6 0%, #3283FE 100%)', // Official Electric Blue Gradient
    color: 'white',
    borderRadius: 3,
    mb: 4,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      width: '40%',
      height: '100%',
      background: 'radial-gradient(circle, rgba(255, 194, 14, 0.15) 0%, transparent 70%)', // Subtle yellow accent
      pointerEvents: 'none',
    },
  }}
>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
    <Avatar
      sx={{
        width: 64,
        height: 64,
        bgcolor: 'rgba(255, 255, 255, 0.2)',
        fontSize: '1.5rem',
        fontWeight: 700,
        fontFamily: 'ITC Avant Garde Gothic Pro, Century Gothic, sans-serif',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      ADH
    </Avatar>
    <Box>
      <Typography
        variant="h3"
        fontWeight={700}
        sx={{ fontFamily: 'Poppins, Inter, sans-serif' }}
      >
        Welcome to ADHelper
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.9 }}>
        Rehrig Pacific IT Administration Portal
      </Typography>
    </Box>
  </Box>

  <Typography variant="body2" sx={{ opacity: 0.8 }}>
    {getGreeting()} • {format(new Date(), 'EEEE, MMMM d, yyyy')} • RPL.LOCAL
  </Typography>
</Paper>
```

### 2. Branded Stat Cards

```typescript
// Stat cards with Official Rehrig color scheme
const stats = [
  {
    title: 'Users Processed Today',
    value: 42,
    icon: <PeopleIcon />,
    color: '#0536B6',  // Official Rehrig Blue Primary
    trend: { value: 12, direction: 'up' },
  },
  {
    title: 'Jira Tickets Updated',
    value: 18,
    icon: <AssignmentIcon />,
    color: '#FFC20E',  // Official Rehrig Yellow
    trend: { value: 8, direction: 'up' },
  },
  {
    title: 'Success Rate',
    value: '98%',
    icon: <CheckCircleIcon />,
    color: '#27AE60',  // Success green
  },
  {
    title: 'Active Sessions',
    value: 3,
    icon: <TrendingUpIcon />,
    color: '#3283FE',  // Rehrig Light Blue
  },
];
```

### 3. Branded Sidebar

```typescript
// Sidebar with Rehrig branding
<Drawer
  sx={{
    '& .MuiDrawer-paper': {
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, #161B22 0%, #0D1117 100%)'
        : 'linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)',
      borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  }}
>
  {/* Logo/Brand Section */}
  <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar
        sx={{
          bgcolor: theme.palette.primary.main,
          width: 40,
          height: 40,
          fontWeight: 600,
        }}
      >
        ADH
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          ADHelper
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rehrig IT Tools
        </Typography>
      </Box>
    </Box>
  </Box>

  {/* Navigation */}
  <List sx={{ px: 2, py: 1 }}>
    {/* ... menu items ... */}
  </List>
</Drawer>
```

### 4. Branded Footer

```typescript
// Footer with Rehrig branding
<Box
  component="footer"
  sx={{
    mt: 'auto',
    py: 3,
    px: 4,
    borderTop: `1px solid ${theme.palette.divider}`,
    background: theme.palette.mode === 'dark'
      ? 'rgba(22, 27, 34, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
  }}
>
  <Grid container spacing={2} alignItems="center">
    <Grid item xs={12} md={6}>
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} Rehrig Pacific Company. All rights reserved.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        ADHelper v{packageJson.version} • RPL.LOCAL Domain
      </Typography>
    </Grid>
    <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
      <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
        <Link
          href="https://rehrig.com"
          target="_blank"
          rel="noopener"
          color="text.secondary"
          underline="hover"
          variant="caption"
        >
          rehrig.com
        </Link>
        <Link
          href="https://rehrigpacific.com"
          target="_blank"
          rel="noopener"
          color="text.secondary"
          underline="hover"
          variant="caption"
        >
          rehrigpacific.com
        </Link>
        <Typography variant="caption" color="text.secondary">
          IT Support
        </Typography>
      </Stack>
    </Grid>
  </Grid>
</Box>
```

### 5. Branded Loading Screen

```typescript
// Splash/Loading screen with Rehrig branding
<Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #003D7A 0%, #0066CC 100%)',
    color: 'white',
  }}
>
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <Avatar
      sx={{
        width: 120,
        height: 120,
        bgcolor: 'rgba(255, 255, 255, 0.2)',
        fontSize: '3rem',
        fontWeight: 700,
        mb: 3,
        backdropFilter: 'blur(10px)',
        border: '3px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      ADH
    </Avatar>
  </motion.div>

  <Typography variant="h3" fontWeight={600} gutterBottom>
    ADHelper
  </Typography>

  <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
    Rehrig Pacific IT Administration
  </Typography>

  <CircularProgress
    size={40}
    thickness={4}
    sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
  />

  <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
    Loading your workspace...
  </Typography>
</Box>
```

### 6. Branded Toast Notifications

```typescript
// Configure notistack with Rehrig branding
<SnackbarProvider
  maxSnack={3}
  anchorOrigin={{
    vertical: 'top',
    horizontal: 'right',
  }}
  autoHideDuration={4000}
  Components={{
    success: forwardRef((props, ref) => (
      <Alert
        ref={ref}
        {...props}
        severity="success"
        variant="filled"
        sx={{
          bgcolor: '#27AE60',
          '& .MuiAlert-icon': { color: 'white' },
        }}
      />
    )),
    error: forwardRef((props, ref) => (
      <Alert
        ref={ref}
        {...props}
        severity="error"
        variant="filled"
        sx={{
          bgcolor: '#C0392B',
          '& .MuiAlert-icon': { color: 'white' },
        }}
      />
    )),
    info: forwardRef((props, ref) => (
      <Alert
        ref={ref}
        {...props}
        severity="info"
        variant="filled"
        sx={{
          bgcolor: '#003D7A',  // Rehrig blue
          '& .MuiAlert-icon': { color: 'white' },
        }}
      />
    )),
  }}
>
  {children}
</SnackbarProvider>
```

---

## 🎨 Complete Rehrig Theme Configuration

### Full Theme File: `src/renderer/theme/rehrigTheme.ts`

```typescript
import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';

/**
 * Official Rehrig Pacific Company Theme
 * Based on official brand guidelines
 *
 * Primary Colors:
 * - Blue Primary: #0536B6
 * - Light Blue: #3283FE (Pantone 2727 C)
 * - Navy: #003063
 * - Yellow: #FFC20E
 * - Gray Dark: #555570
 *
 * Typography:
 * - Web/App: Poppins (primary), Inter (fallback)
 * - Brand: ITC Avant Garde Gothic Pro
 * - Office: Franklin Gothic
 */

export const getRehrigTheme = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: isLight ? '#0536B6' : '#3283FE',  // Official Rehrig Blue
        light: isLight ? '#3283FE' : '#5CA3FF',
        dark: isLight ? '#003063' : '#0536B6',  // Rehrig Navy
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FFC20E',  // Official Rehrig Yellow (same in both modes)
        light: '#FFD04D',
        dark: '#E6AD00',
        contrastText: isLight ? '#003063' : '#000000',  // Navy or black text
      },
      success: {
        main: '#27AE60',
        light: '#2ECC71',
        dark: '#1E8449',
      },
      warning: {
        main: '#F39C12',
        light: '#F1C40F',
        dark: '#D68910',
      },
      error: {
        main: '#C0392B',
        light: '#E74C3C',
        dark: '#922B21',
      },
      info: {
        main: '#2980B9',
        light: '#3498DB',
        dark: '#1F618D',
      },
      background: {
        default: isLight ? '#F5F7FA' : '#0D1117',
        paper: isLight ? '#FFFFFF' : '#161B22',
      },
      text: {
        primary: isLight ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
        secondary: isLight ? 'rgba(0, 0, 0, 0.60)' : 'rgba(255, 255, 255, 0.60)',
        disabled: isLight ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
      },
      divider: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    },

    typography: {
      fontFamily: [
        'Poppins',              // Official Rehrig web font
        'Inter',                // Modern fallback
        'Segoe UI',             // Windows native
        '-apple-system',
        'BlinkMacSystemFont',
        'system-ui',
        'sans-serif',
      ].join(','),

      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
        letterSpacing: '0.02em',
      },
    },

    shape: {
      borderRadius: 12,
    },

    shadows: [
      'none',
      isLight
        ? '0px 2px 4px rgba(0, 61, 122, 0.08)'
        : '0px 2px 4px rgba(0, 0, 0, 0.3)',
      isLight
        ? '0px 4px 8px rgba(0, 61, 122, 0.12)'
        : '0px 4px 8px rgba(0, 0, 0, 0.4)',
      isLight
        ? '0px 8px 16px rgba(0, 61, 122, 0.16)'
        : '0px 8px 16px rgba(0, 0, 0, 0.5)',
      // ... more shadows
    ] as any,

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: isLight
                ? '0px 4px 12px rgba(0, 61, 122, 0.2)'
                : '0px 4px 12px rgba(74, 144, 226, 0.3)',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: isLight
                ? '0px 6px 16px rgba(0, 61, 122, 0.25)'
                : '0px 6px 16px rgba(74, 144, 226, 0.35)',
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isLight
              ? '0px 2px 8px rgba(0, 61, 122, 0.08)'
              : '0px 2px 8px rgba(0, 0, 0, 0.4)',
            border: `1px solid ${isLight ? 'rgba(0, 61, 122, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isLight
                ? '0px 8px 24px rgba(0, 61, 122, 0.12)'
                : '0px 8px 24px rgba(0, 0, 0, 0.6)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: isLight
              ? '0px 2px 4px rgba(0, 61, 122, 0.08)'
              : '0px 2px 4px rgba(0, 0, 0, 0.3)',
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? '#003D7A' : '#4A90E2',
              },
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
```

---

## 📋 Branded Dashboard Implementation

### Complete Dashboard with Rehrig Branding

```typescript
// src/renderer/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import CountUp from 'react-countup';

const Dashboard = () => {
  const [stats, setStats] = useState({
    usersProcessed: 42,
    jiraTickets: 18,
    successRate: 98,
    activeSessions: 3,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Hero Section with Rehrig Branding */}
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          p: 4,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #2E5C8A 0%, #4A90E2 100%)'
              : 'linear-gradient(135deg, #003D7A 0%, #0066CC 100%)',
          color: 'white',
          borderRadius: 3,
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              fontSize: '1.5rem',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            ADH
          </Avatar>
          <Box>
            <Typography variant="h3" fontWeight={600}>
              {getGreeting()}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Rehrig Pacific IT Administration Portal
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • RPL.LOCAL Domain
        </Typography>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Users Processed Today',
            value: stats.usersProcessed,
            icon: <PeopleIcon />,
            color: '#003D7A',
            trend: { value: 12, direction: 'up' },
          },
          {
            title: 'Jira Tickets Updated',
            value: stats.jiraTickets,
            icon: <AssignmentIcon />,
            color: '#FF6B35',
            trend: { value: 8, direction: 'up' },
          },
          {
            title: 'Success Rate',
            value: `${stats.successRate}%`,
            icon: <CheckCircleIcon />,
            color: '#27AE60',
            showProgress: true,
          },
          {
            title: 'Active Sessions',
            value: stats.activeSessions,
            icon: <TrendingUpIcon />,
            color: '#F39C12',
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              sx={{
                height: '100%',
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? alpha(stat.color, 0.1)
                    : 'white',
                borderLeft: `4px solid ${stat.color}`,
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(stat.color, 0.1),
                        color: stat.color,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                    {stat.trend && (
                      <Chip
                        icon={stat.trend.direction === 'up' ? <ArrowUpward /> : <ArrowDownward />}
                        label={`${stat.trend.value}%`}
                        size="small"
                        color={stat.trend.direction === 'up' ? 'success' : 'error'}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {typeof stat.value === 'number' ? (
                        <CountUp end={stat.value} duration={1.5} />
                      ) : (
                        stat.value
                      )}
                    </Typography>
                  </Box>

                  {stat.showProgress && (
                    <LinearProgress
                      variant="determinate"
                      value={stats.successRate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha(stat.color, 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stat.color,
                          borderRadius: 3,
                        },
                      }}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>
            Quick Actions
          </Typography>
          <IconButton size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          {[
            { label: 'Process New User', color: '#003D7A', action: 'adhelper' },
            { label: 'Update Jira Tickets', color: '#FF6B35', action: 'jira' },
            { label: 'View Reports', color: '#27AE60', action: 'reports' },
            { label: 'Settings', color: '#F39C12', action: 'settings' },
          ].map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                component={motion.div}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                sx={{
                  cursor: 'pointer',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? alpha(action.color, 0.1)
                      : alpha(action.color, 0.05),
                  borderLeft: `3px solid ${action.color}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: (theme) => `0 4px 12px ${alpha(action.color, 0.3)}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body1" fontWeight={500} color={action.color}>
                    {action.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recent Activity */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Recent Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Activity log will appear here...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;
```

---

## 🎯 Implementation Checklist

### Phase 1: Brand Foundation (2-3 hours)

- [ ] **Install Official Rehrig Fonts**

  ```bash
  # Add to index.html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```

- [ ] **Create Rehrig theme file**
  - Create `src/renderer/theme/rehrigTheme.ts`
  - Copy complete theme configuration from above
  - Uses official colors: `#0536B6`, `#3283FE`, `#FFC20E`, `#003063`
  - Update `App.tsx` to use `getRehrigTheme()`

- [ ] **Update color constants**
  - Replace `#1976d2` with `#0536B6` (Rehrig Blue Primary)
  - Replace `#dc004e` with `#FFC20E` (Rehrig Yellow)
  - Use `theme.palette.primary.main` instead of hardcoded colors

- [ ] **Add brand assets**
  - Create ADH logo/avatar component with Rehrig blue
  - Update `public/icon.ico` with Rehrig-branded icon
  - Consider adding Rehrig "R" logo if available

### Phase 2: Component Updates (3-4 hours)

- [ ] **Update Dashboard**
  - Implement hero section with Rehrig branding
  - Update stat cards with brand colors
  - Add quick actions section

- [ ] **Update Sidebar**
  - Add Rehrig branding to header
  - Update navigation styling
  - Add footer with company info

- [ ] **Update Forms**
  - Apply consistent border radius (8px)
  - Use brand colors for focus states
  - Add proper validation styling

### Phase 3: Polish (1-2 hours)

- [ ] **Add footer component**
  - Company copyright
  - Links to rehrig.com, rehrigpacific.com
  - Version information

- [ ] **Update loading states**
  - Branded splash screen
  - Skeleton screens with brand colors
  - Progress indicators

- [ ] **Test dark/light modes**
  - Verify all colors work in both modes
  - Check contrast ratios
  - Test all components

---

## 🚀 Quick Start Commands

```bash
# Install recommended packages for full modernization
npm install notistack framer-motion react-countup date-fns

# Start development server
npm run dev

# Build for production
npm run build:win
```

---

## 📊 Official Rehrig Brand Color Usage Guide

| Element | Light Mode | Dark Mode | Usage |
| ------- | ---------- | --------- | ----- |
| Primary Actions | `#0536B6` | `#3283FE` | Buttons, links, active states (Official Rehrig Blue) |
| Secondary Actions | `#FFC20E` | `#FFC20E` | Accents, highlights, CTAs (Official Rehrig Yellow) |
| Navy Accent | `#003063` | `#003063` | Dark accents, headers, footers (Official Rehrig Navy) |
| Gray Accent | `#555570` | `#7A7A8F` | Tertiary elements, disabled states (Official Rehrig Gray) |
| Success | `#27AE60` | `#27AE60` | Confirmations, completed tasks |
| Warning | `#F39C12` | `#F39C12` | Alerts, pending actions |
| Error | `#C0392B` | `#C0392B` | Errors, destructive actions |
| Background | `#F5F7FA` | `#0D1117` | Page background |
| Surface | `#FFFFFF` | `#161B22` | Cards, papers, modals |

### Official Rehrig Color Codes

**Primary Palette:**
- **Rehrig Blue Primary:** `#0536B6` (Main brand color)
- **Rehrig Light Blue:** `#3283FE` (Pantone 2727 C equivalent)
- **Rehrig Navy:** `#003063` (Dark accent)
- **Rehrig Yellow:** `#FFC20E` (Secondary brand color)
- **Rehrig Gray Dark:** `#555570` (Tertiary color)

**Gradients:**
- **Electric Blue:** `linear-gradient(90deg, #0536B6 0%, #3283FE 100%)`
- **Blue to Navy:** `linear-gradient(135deg, #0536B6 0%, #003063 100%)`
- **Blue to Yellow:** `linear-gradient(135deg, #0536B6 0%, #FFC20E 100%)`

---

## ✅ Success Metrics

After implementing Rehrig branding:

- **Brand Consistency:** 100% alignment with professional enterprise standards
- **User Recognition:** Immediate association with Rehrig Pacific
- **Visual Hierarchy:** Clear distinction between primary and secondary actions
- **Accessibility:** WCAG 2.1 AA compliant color contrasts
- **Professional Appearance:** Modern, trustworthy, enterprise-grade UI

---

## 📝 Notes

1. **Logo/Icon:** Consider creating a custom icon with Rehrig's actual logo if available
2. **Color Verification:** Confirm primary blue matches Rehrig's official brand colors
3. **Typography:** Inter Variable provides excellent readability for enterprise applications
4. **Consistency:** All components use the same color palette and spacing system
5. **Scalability:** Theme system allows easy updates if brand guidelines change

