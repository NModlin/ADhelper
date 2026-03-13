import React from 'react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  Action,
  ActionImpl,
} from 'kbar';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ── Result list renderer ────────────────────────────────────────────────
function RenderResults() {
  const { results } = useMatches();
  const theme = useTheme();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === 'string') {
          // Section header
          return (
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1.5,
                pb: 0.5,
                display: 'block',
                color: 'text.disabled',
                fontSize: '0.625rem',
                letterSpacing: '0.1em',
              }}
            >
              {item}
            </Typography>
          );
        }

        return (
          <Box
            sx={{
              px: 2,
              py: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: active
                ? theme.palette.action.selected
                : 'transparent',
              borderLeft: active
                ? `3px solid ${theme.palette.primary.main}`
                : '3px solid transparent',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" fontWeight={active ? 600 : 400}>
                {(item as ActionImpl).name}
              </Typography>
              {(item as ActionImpl).subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {(item as ActionImpl).subtitle}
                </Typography>
              )}
            </Box>
            {(item as ActionImpl).shortcut?.length ? (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(item as ActionImpl).shortcut!.map((sc: string) => (
                  <Box
                    key={sc}
                    component="kbd"
                    sx={{
                      px: 0.8,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      backgroundColor: theme.palette.action.hover,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {sc}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      }}
    />
  );
}

// ── Props ────────────────────────────────────────────────────────────────
export interface CommandPaletteProps {
  actions: Action[];
  children: React.ReactNode;
}

/**
 * CommandPalette — wraps children in KBarProvider and renders
 * the modal with search + results. Open with Ctrl+K.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  actions,
  children,
}) => {
  const theme = useTheme();

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner
          style={{ zIndex: 1500, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <KBarAnimator
            style={{
              maxWidth: 560,
              width: '100%',
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[16],
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <KBarSearch
              style={{
                padding: '14px 16px',
                fontSize: '15px',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
                border: 'none',
                borderBottom: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
                fontFamily: 'inherit',
              }}
              defaultPlaceholder="Type a command or search…"
            />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
};

export default CommandPalette;

