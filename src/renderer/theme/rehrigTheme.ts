import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Official Rehrig Pacific Company Theme
 * Based on official brand guidelines
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
        ? '0px 2px 4px rgba(5, 54, 182, 0.08)'
        : '0px 2px 4px rgba(0, 0, 0, 0.3)',
      isLight
        ? '0px 4px 8px rgba(5, 54, 182, 0.12)'
        : '0px 4px 8px rgba(0, 0, 0, 0.4)',
      isLight
        ? '0px 8px 16px rgba(5, 54, 182, 0.16)'
        : '0px 8px 16px rgba(0, 0, 0, 0.5)',
      isLight
        ? '0px 12px 24px rgba(5, 54, 182, 0.18)'
        : '0px 12px 24px rgba(0, 0, 0, 0.6)',
      // Continue with remaining shadow levels (5-24)
      ...Array(20).fill(isLight
        ? '0px 16px 32px rgba(5, 54, 182, 0.20)'
        : '0px 16px 32px rgba(0, 0, 0, 0.7)'),
    ] as any,
  };
  
  return createTheme(themeOptions);
};

