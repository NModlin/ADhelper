import { ReactNode } from 'react';
import { Tooltip, Box, Typography, IconButton, Link, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialSymbol } from './MaterialSymbol';

export interface HelpTooltipProps {
  /** Tooltip heading */
  title: string;
  /** Tooltip body — text or JSX */
  content: ReactNode;
  /** Optional documentation URL */
  docsUrl?: string;
  /** Icon size (default 18) */
  size?: number;
  /** Placement */
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Contextual help tooltip — a small "?" icon that shows
 * a rich tooltip with a title, description, and optional docs link.
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  docsUrl,
  size = 18,
  placement = 'top',
}) => {
  const theme = useTheme();

  return (
    <Tooltip
      placement={placement}
      arrow
      title={
        <Box sx={{ p: 1, maxWidth: 280 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {content}
          </Typography>
          {docsUrl && (
            <Link
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ mt: 1, display: 'inline-block' }}
            >
              Learn more →
            </Link>
          )}
        </Box>
      }
    >
      <IconButton
        size="small"
        aria-label={`Help: ${title}`}
        sx={{
          width: size + 8,
          height: size + 8,
          color: alpha(theme.palette.text.secondary, 0.5),
          '&:hover': { color: theme.palette.primary.main },
        }}
      >
        <MaterialSymbol icon="help" size={size} />
      </IconButton>
    </Tooltip>
  );
};

export default HelpTooltip;

