import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';

/**
 * Official Rehrig Pacific Company Theme — Phase 1 Modernized
 * Based on official brand guidelines + Material Design 3 tokens
 *
 * Primary Colors:
 * - Blue Primary: #0536B6 (Main brand color)
 * - Light Blue: #3283FE (Pantone 2727 C)
 * - Navy: #003063 (Dark accent)
 * - Yellow: #FFC20E (Secondary brand color)
 * - Gray Dark: #555570 (Tertiary color)
 *
 * Typography:
 * - Web/App: Poppins (primary), Inter (fallback)
 * - Brand: ITC Avant Garde Gothic Pro
 * - Office: Franklin Gothic
 *
 * Gradients:
 * - Electric Blue: linear-gradient(90deg, #0536B6 0%, #3283FE 100%)
 */

// --- Rehrig brand constants ------------------------------------------------
const REHRIG_BLUE = '#0536B6';
const REHRIG_LIGHT_BLUE = '#3283FE';
const REHRIG_NAVY = '#003063';
const REHRIG_YELLOW = '#FFC20E';

// Shared transition curve (Material 3 standard easing)
const MD3_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

export const getRehrigTheme = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';

  // Pre-compute primary color for component overrides
  const primaryMain = isLight ? REHRIG_BLUE : REHRIG_LIGHT_BLUE;

  const themeOptions: ThemeOptions = {
    // ── Palette ────────────────────────────────────────────────────────
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: isLight ? REHRIG_LIGHT_BLUE : '#5CA3FF',
        dark: isLight ? REHRIG_NAVY : REHRIG_BLUE,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: REHRIG_YELLOW,
        light: '#FFD04D',
        dark: '#E6AD00',
        contrastText: isLight ? REHRIG_NAVY : '#000000',
      },
      success: {
        main: '#2E7D32',
        light: '#4CAF50',
        dark: '#1B5E20',
      },
      warning: {
        main: '#F57C00',
        light: '#FF9800',
        dark: '#E65100',
      },
      error: {
        main: '#D32F2F',
        light: '#EF5350',
        dark: '#C62828',
      },
      info: {
        main: '#0288D1',
        light: '#03A9F4',
        dark: '#01579B',
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
      divider: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
      action: {
        hover: isLight
          ? alpha(REHRIG_BLUE, 0.04)
          : alpha(REHRIG_LIGHT_BLUE, 0.08),
        selected: isLight
          ? alpha(REHRIG_BLUE, 0.08)
          : alpha(REHRIG_LIGHT_BLUE, 0.12),
        focus: isLight
          ? alpha(REHRIG_BLUE, 0.12)
          : alpha(REHRIG_LIGHT_BLUE, 0.16),
      },
    },

    // ── Typography ─────────────────────────────────────────────────────
    typography: {
      fontFamily: [
        'Poppins',
        'Inter',
        'Segoe UI Variable',
        '-apple-system',
        'BlinkMacSystemFont',
        'system-ui',
        'sans-serif',
      ].join(','),
      h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.4 },
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 },
      h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
      subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' },
      subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5, letterSpacing: '0.03em' },
      overline: { fontSize: '0.625rem', fontWeight: 600, lineHeight: 2, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
      button: { textTransform: 'none' as const, fontWeight: 500, letterSpacing: '0.02em' },
    },

    // ── Shape ──────────────────────────────────────────────────────────
    shape: { borderRadius: 12 },

    // ── Shadows (25-level scale, Rehrig-blue tinted for light) ─────────
    shadows: [
      'none',
      isLight ? '0 1px 2px rgba(5,54,182,0.06)' : '0 1px 2px rgba(0,0,0,0.24)',
      isLight ? '0 2px 4px rgba(5,54,182,0.08)' : '0 2px 4px rgba(0,0,0,0.28)',
      isLight ? '0 4px 8px rgba(5,54,182,0.10)' : '0 4px 8px rgba(0,0,0,0.32)',
      isLight ? '0 6px 12px rgba(5,54,182,0.12)' : '0 6px 12px rgba(0,0,0,0.36)',
      isLight ? '0 8px 16px rgba(5,54,182,0.14)' : '0 8px 16px rgba(0,0,0,0.40)',
      isLight ? '0 10px 20px rgba(5,54,182,0.15)' : '0 10px 20px rgba(0,0,0,0.42)',
      isLight ? '0 12px 24px rgba(5,54,182,0.16)' : '0 12px 24px rgba(0,0,0,0.44)',
      isLight ? '0 14px 28px rgba(5,54,182,0.17)' : '0 14px 28px rgba(0,0,0,0.46)',
      isLight ? '0 16px 32px rgba(5,54,182,0.18)' : '0 16px 32px rgba(0,0,0,0.48)',
      isLight ? '0 18px 36px rgba(5,54,182,0.19)' : '0 18px 36px rgba(0,0,0,0.50)',
      isLight ? '0 20px 40px rgba(5,54,182,0.20)' : '0 20px 40px rgba(0,0,0,0.52)',
      isLight ? '0 22px 44px rgba(5,54,182,0.21)' : '0 22px 44px rgba(0,0,0,0.54)',
      isLight ? '0 24px 48px rgba(5,54,182,0.22)' : '0 24px 48px rgba(0,0,0,0.56)',
      isLight ? '0 26px 52px rgba(5,54,182,0.23)' : '0 26px 52px rgba(0,0,0,0.58)',
      isLight ? '0 28px 56px rgba(5,54,182,0.24)' : '0 28px 56px rgba(0,0,0,0.60)',
      isLight ? '0 30px 60px rgba(5,54,182,0.25)' : '0 30px 60px rgba(0,0,0,0.62)',
      isLight ? '0 32px 64px rgba(5,54,182,0.25)' : '0 32px 64px rgba(0,0,0,0.64)',
      isLight ? '0 34px 68px rgba(5,54,182,0.26)' : '0 34px 68px rgba(0,0,0,0.66)',
      isLight ? '0 36px 72px rgba(5,54,182,0.26)' : '0 36px 72px rgba(0,0,0,0.68)',
      isLight ? '0 38px 76px rgba(5,54,182,0.27)' : '0 38px 76px rgba(0,0,0,0.70)',
      isLight ? '0 40px 80px rgba(5,54,182,0.27)' : '0 40px 80px rgba(0,0,0,0.72)',
      isLight ? '0 42px 84px rgba(5,54,182,0.28)' : '0 42px 84px rgba(0,0,0,0.74)',
      isLight ? '0 44px 88px rgba(5,54,182,0.28)' : '0 44px 88px rgba(0,0,0,0.76)',
      isLight ? '0 46px 92px rgba(5,54,182,0.29)' : '0 46px 92px rgba(0,0,0,0.78)',
    ] as any,

    // ── Component overrides ────────────────────────────────────────────
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 600,
            transition: `all 0.2s ${MD3_EASING}`,
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            boxShadow: isLight
              ? '0 2px 6px rgba(5,54,182,0.18)'
              : '0 2px 6px rgba(0,0,0,0.3)',
            '&:hover': {
              boxShadow: isLight
                ? '0 4px 12px rgba(5,54,182,0.25)'
                : '0 4px 12px rgba(0,0,0,0.45)',
            },
          },
          outlined: {
            borderWidth: 1.5,
            '&:hover': {
              borderWidth: 1.5,
              backgroundColor: alpha(primaryMain, 0.04),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: isLight
              ? '0 2px 8px rgba(5,54,182,0.06)'
              : '0 2px 8px rgba(0,0,0,0.24)',
            transition: `all 0.25s ${MD3_EASING}`,
            '&:hover': {
              boxShadow: isLight
                ? '0 4px 16px rgba(5,54,182,0.12)'
                : '0 4px 16px rgba(0,0,0,0.36)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 16,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: '2px 8px',
            transition: `all 0.15s ${MD3_EASING}`,
            '&.Mui-selected': {
              backgroundColor: alpha(primaryMain, 0.12),
              '&:hover': {
                backgroundColor: alpha(primaryMain, 0.18),
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 500,
          },
          standardSuccess: {
            backgroundColor: isLight ? alpha('#2E7D32', 0.08) : alpha('#4CAF50', 0.12),
            border: `1px solid ${isLight ? alpha('#2E7D32', 0.20) : alpha('#4CAF50', 0.20)}`,
          },
          standardError: {
            backgroundColor: isLight ? alpha('#D32F2F', 0.08) : alpha('#EF5350', 0.12),
            border: `1px solid ${isLight ? alpha('#D32F2F', 0.20) : alpha('#EF5350', 0.20)}`,
          },
          standardWarning: {
            backgroundColor: isLight ? alpha('#F57C00', 0.08) : alpha('#FF9800', 0.12),
            border: `1px solid ${isLight ? alpha('#F57C00', 0.20) : alpha('#FF9800', 0.20)}`,
          },
          standardInfo: {
            backgroundColor: isLight ? alpha('#0288D1', 0.08) : alpha('#03A9F4', 0.12),
            border: `1px solid ${isLight ? alpha('#0288D1', 0.20) : alpha('#03A9F4', 0.20)}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              transition: `all 0.15s ${MD3_EASING}`,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: primaryMain,
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
            backgroundColor: isLight
              ? alpha('#FFFFFF', 0.8)
              : alpha('#161B22', 0.8),
            color: isLight ? 'rgba(0,0,0,0.87)' : 'rgba(255,255,255,0.87)',
            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: 'none',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: isLight ? alpha(REHRIG_BLUE, 0.04) : alpha(REHRIG_LIGHT_BLUE, 0.06),
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.8125rem',
            fontWeight: 500,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

