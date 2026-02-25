import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

export interface StatCardProps {
  /** Display title */
  title: string;
  /** Numeric or text value */
  value: number | string;
  /** Material Symbol icon name */
  icon: ReactNode;
  /** Theme palette color key */
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  /** Optional trend indicator */
  trend?: { value: number; direction: 'up' | 'down' };
  /** Optional click handler — makes the card interactive */
  onClick?: () => void;
  /** Optional subtitle / secondary text */
  subtitle?: string;
}

/**
 * Reusable stat card with colored top accent bar, icon avatar,
 * optional trend chip, and hover elevation.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  onClick,
  subtitle,
}) => {
  const theme = useTheme();
  const paletteColor = theme.palette[color];

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': onClick
          ? { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] }
          : {},
        // Colored top accent bar
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${paletteColor.main}, ${paletteColor.light})`,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(paletteColor.main, 0.12),
              color: paletteColor.main,
              width: 52,
              height: 52,
            }}
          >
            {icon}
          </Avatar>

          {trend && (
            <Chip
              label={`${trend.direction === 'up' ? '+' : ''}${trend.value}%`}
              size="small"
              color={trend.direction === 'up' ? 'success' : 'error'}
              icon={
                <MaterialSymbol
                  icon={trend.direction === 'up' ? 'trending_up' : 'trending_down'}
                  size={16}
                />
              }
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}
        </Box>

        <Typography variant="h4" fontWeight={700} gutterBottom>
          {value}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

