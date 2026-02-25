import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

export interface ActivityItem {
  id: string;
  /** Material Symbol icon name */
  icon: string;
  /** Color key from theme palette */
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  /** Primary text */
  title: string;
  /** Secondary description */
  description?: string;
  /** Timestamp label */
  timestamp: string;
}

export interface ActivityTimelineProps {
  items: ActivityItem[];
  /** Max items to display (default: 6) */
  maxItems?: number;
}

/**
 * Vertical activity timeline showing recent events.
 * Each item has a colored icon dot, title, description, and timestamp.
 */
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  items,
  maxItems = 6,
}) => {
  const theme = useTheme();
  const visibleItems = items.slice(0, maxItems);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Recent Activity
      </Typography>

      {visibleItems.length === 0 ? (
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
          <MaterialSymbol icon="history" size={48} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            No recent activity
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {visibleItems.map((item, idx) => {
            const paletteColor = theme.palette[item.color];
            const isLast = idx === visibleItems.length - 1;

            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  position: 'relative',
                  pb: isLast ? 0 : 2.5,
                }}
              >
                {/* Timeline connector line */}
                {!isLast && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 18,
                      top: 40,
                      bottom: 0,
                      width: 2,
                      bgcolor: alpha(paletteColor.main, 0.2),
                    }}
                  />
                )}

                {/* Icon dot */}
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(paletteColor.main, 0.12),
                    color: paletteColor.main,
                    flexShrink: 0,
                  }}
                >
                  <MaterialSymbol icon={item.icon} size={18} filled />
                </Avatar>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 1 }}>
                      {item.timestamp}
                    </Typography>
                  </Box>
                  {item.description && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {item.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default ActivityTimeline;

