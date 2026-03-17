import { ReactNode } from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

export interface EmptyStateProps {
  /** Material Symbol icon name */
  icon: string;
  /** Primary heading */
  title: string;
  /** Descriptive message */
  description: string;
  /** Optional CTA button */
  actionLabel?: string;
  /** Click handler for the CTA */
  onAction?: () => void;
  /** Extra content below the message */
  children?: ReactNode;
}

/**
 * Friendly empty-state placeholder with icon illustration,
 * message, and optional call-to-action button.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 3,
      }}
    >
      {/* Illustrated icon circle */}
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.10)} 0%, ${alpha(theme.palette.primary.light, 0.06)} 100%)`,
          border: `2px dashed ${alpha(theme.palette.primary.main, 0.20)}`,
        }}
      >
        <MaterialSymbol
          icon={icon}
          size={44}
          color={alpha(theme.palette.primary.main, 0.5)}
        />
      </Box>

      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 360, mb: actionLabel ? 3 : 0 }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} startIcon={<MaterialSymbol icon="add" size={18} />}>
          {actionLabel}
        </Button>
      )}

      {children}
    </Box>
  );
};

export default EmptyState;

