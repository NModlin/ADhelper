import React, { useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import { MaterialSymbol } from './MaterialSymbol';

/** Determine colour & weight for a terminal line based on PowerShell patterns */
export function formatTerminalLine(line: string): { color: string; fontWeight: string } {
  let color = 'inherit';
  let fontWeight = 'normal';

  if (line.includes('✅') || line.includes('SUCCESS')) {
    color = '#4caf50';
  } else if (line.includes('❌') || line.includes('ERROR') || line.includes('Failed')) {
    color = '#f44336';
  } else if (line.includes('⚠️') || line.includes('WARNING') || line.includes('WARN')) {
    color = '#ff9800';
  } else if (line.includes('💡') || line.includes('INFO')) {
    color = '#2196f3';
  } else if (line.includes('🔍') || line.includes('Checking')) {
    color = '#00bcd4';
  } else if (line.includes('===') || line.includes('---')) {
    color = '#9e9e9e';
    fontWeight = 'bold';
  }

  return { color, fontWeight };
}

export interface TerminalOutputProps {
  lines: string[];
  title?: string;
  compact?: boolean;
  defaultExpanded?: boolean;
  statusChip?: 'running' | 'completed' | 'error' | null;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({
  lines,
  title = 'PowerShell Terminal Output',
  compact = false,
  statusChip = null,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll] = React.useState(true);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (terminalRef.current && autoScroll) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      /* clipboard not available */
    }
  }, [lines]);

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#1e1e1e',
          color: '#fff',
          borderBottom: '1px solid #333',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* macOS-style traffic lights */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} />
          </Box>
          <MaterialSymbol icon="terminal" size={20} sx={{ color: '#fff' }} />
          <Typography variant={compact ? 'subtitle2' : 'subtitle1'} sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {statusChip === 'running' && (
            <Chip
              label="Running"
              size="small"
              color="primary"
              icon={<CircularProgress size={12} sx={{ color: 'white !important' }} />}
            />
          )}
          {statusChip === 'completed' && <Chip label="Completed" size="small" color="success" />}
          {statusChip === 'error' && <Chip label="Error" size="small" color="error" />}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {lines.length > 0 && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }}>
              {lines.length} line{lines.length !== 1 ? 's' : ''}
            </Typography>
          )}
          <Tooltip title="Copy all output">
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#aaa' }}>
              <MaterialSymbol icon="content_copy" size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export default TerminalOutput;

