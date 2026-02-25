import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  onClick: () => void;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

/**
 * Quick-actions panel for the dashboard.
 * Displays a list of actionable items with icon, label, and optional description.
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
}) => {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>

      {actions.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            color: 'text.disabled',
          }}
        >
          <MaterialSymbol icon="bolt" size={48} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            No actions available
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {actions.map((action) => {
            const paletteColor = theme.palette[action.color];

            return (
              <ListItemButton
                key={action.id}
                onClick={action.onClick}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: `1px solid ${alpha(paletteColor.main, 0.12)}`,
                  '&:hover': {
                    backgroundColor: alpha(paletteColor.main, 0.06),
                    borderColor: alpha(paletteColor.main, 0.3),
                  },
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                }}
              >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(paletteColor.main, 0.1),
                      color: paletteColor.main,
                    }}
                  >
                    <MaterialSymbol icon={action.icon} size={20} filled />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={action.label}
                  secondary={action.description}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
                <MaterialSymbol icon="chevron_right" size={20} color={theme.palette.text.disabled} />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default QuickActions;

