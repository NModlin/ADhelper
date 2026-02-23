import { SxProps, Theme } from '@mui/material';
import Box from '@mui/material/Box';

export interface MaterialSymbolProps {
  /** The Material Symbol name (e.g., 'dashboard', 'person', 'settings') */
  icon: string;
  /** Whether to use the filled variant */
  filled?: boolean;
  /** Icon size in pixels (default: 24) */
  size?: number;
  /** Font weight (default: 400) */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Optional MUI sx prop for additional styling */
  sx?: SxProps<Theme>;
  /** Optional className */
  className?: string;
  /** Optional color (inherits from parent by default) */
  color?: string;
}

/**
 * Reusable Material Symbols component using Google's Material Symbols Outlined font.
 * The font is already loaded in index.html.
 *
 * Usage:
 *   <MaterialSymbol icon="dashboard" />
 *   <MaterialSymbol icon="person" filled size={20} />
 */
export const MaterialSymbol = ({
  icon,
  filled = false,
  size = 24,
  weight = 400,
  sx,
  className,
  color,
}: MaterialSymbolProps) => {
  return (
    <Box
      component="span"
      className={`material-symbols-outlined ${className ?? ''}`}
      sx={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        color: color ?? 'inherit',
        ...((sx as Record<string, unknown>) ?? {}),
      }}
    >
      {icon}
    </Box>
  );
};

export default MaterialSymbol;

