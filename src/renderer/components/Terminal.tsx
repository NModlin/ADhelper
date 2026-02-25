import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Collapse,
  Chip,
  CircularProgress,
  LinearProgress,
  Fab,
} from '@mui/material';
import { MaterialSymbol } from './MaterialSymbol';
import { formatTerminalLine } from '../utils/terminalFormatting';

export interface TerminalProps {
  /** Lines of terminal output to display */
  output: string[];
  /** Whether a process is currently running */
  loading?: boolean;
  /** Title displayed in the terminal header */
  title?: string;
  /** Called when the user clicks the clear button */
  onClear?: () => void;
  /** Whether to show a collapse/expand toggle */
  collapsible?: boolean;
  /** Whether to show line numbers on the left */
  showLineNumbers?: boolean;
  /** Progress percentage (0-100) or null to hide progress bar */
  progressPercent?: number | null;
  /** Max height of the output area in px */
  maxHeight?: number;
  /** Min height of the output area in px */
  minHeight?: number;
  /** Whether the terminal starts collapsed */
  defaultCollapsed?: boolean;
}

const Terminal: React.FC<TerminalProps> = ({
  output,
  loading = false,
  title = 'PowerShell Terminal Output',
  onClear,
  collapsible = true,
  showLineNumbers = true,
  progressPercent = null,
  maxHeight = 500,
  minHeight = 200,
  defaultCollapsed = false,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Auto-scroll to bottom when new output arrives, unless user scrolled up
  useEffect(() => {
    if (isAtBottom && terminalRef.current && !isCollapsed) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, isAtBottom, isCollapsed]);

  const handleScroll = useCallback(() => {
    const el = terminalRef.current;
    if (!el) return;
    const threshold = 50;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  const handleCopy = async () => {
    if (output.length === 0) return;
    try {
      await navigator.clipboard.writeText(output.join('\n'));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Clipboard API may not be available in all Electron contexts
    }
  };

  const visible = loading || output.length > 0;
  if (!visible) return null;

  return (
    <Paper sx={{ mb: 3, overflow: 'hidden' }} data-testid="terminal">
      {/* Terminal Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#2d2d2d',
          borderBottom: isCollapsed ? 'none' : '1px solid #444',
        }}
      >
        {/* macOS traffic-light dots + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.75, mr: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} data-testid="dot-red" />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} data-testid="dot-yellow" />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} data-testid="dot-green" />
          </Box>
          <MaterialSymbol icon="terminal" size={18} sx={{ color: '#d4d4d4' }} />
          <Typography variant="body2" sx={{ color: '#d4d4d4', fontFamily: '"Consolas", "Courier New", monospace' }}>
            {title}
          </Typography>
          {loading && (
            <Chip
              label="Running"
              size="small"
              color="primary"
              icon={<CircularProgress size={12} sx={{ color: 'white !important' }} />}
              data-testid="chip-running"
            />
          )}
          {!loading && output.length > 0 && (
            <Chip label="Completed" size="small" color="success" data-testid="chip-completed" />
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onClear && (
            <Tooltip title="Clear terminal">
              <span>
                <IconButton size="small" onClick={onClear} disabled={loading || output.length === 0} sx={{ color: '#d4d4d4' }} aria-label="Clear terminal">
                  <MaterialSymbol icon="clear" size={18} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title={copySuccess ? 'Copied!' : 'Copy output'}>
            <span>
              <IconButton size="small" onClick={handleCopy} disabled={output.length === 0} sx={{ color: copySuccess ? '#4caf50' : '#d4d4d4' }} aria-label="Copy output">
                <MaterialSymbol icon={copySuccess ? 'check' : 'content_copy'} size={18} />
              </IconButton>
            </span>
          </Tooltip>
          {collapsible && (
            <Tooltip title={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}>
              <IconButton size="small" onClick={() => setIsCollapsed(c => !c)} sx={{ color: '#d4d4d4' }} aria-label={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}>
                <MaterialSymbol icon={isCollapsed ? 'expand_more' : 'expand_less'} size={18} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Progress bar */}
      {loading && progressPercent !== null && !isCollapsed && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#1e1e1e' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress variant="determinate" value={progressPercent} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
            <Typography variant="caption" sx={{ color: '#d4d4d4', minWidth: 40, textAlign: 'right' }}>
              {progressPercent}%
            </Typography>
          </Box>
        </Box>
      )}

      {/* Output area */}
      <Collapse in={!isCollapsed}>
        <Box sx={{ position: 'relative' }}>
          <Box
            ref={terminalRef}
            onScroll={handleScroll}
            data-testid="terminal-output"
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 2,
              fontFamily: '"Consolas", "Courier New", monospace',
              fontSize: '13px',
              maxHeight,
              minHeight,
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: '10px' },
              '&::-webkit-scrollbar-track': { background: '#2d2d2d' },
              '&::-webkit-scrollbar-thumb': { background: '#555', borderRadius: '5px' },
              '&::-webkit-scrollbar-thumb:hover': { background: '#777' },
            }}
          >
            {output.length === 0 && loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#00bcd4' }}>
                <CircularProgress size={16} sx={{ color: '#00bcd4' }} />
                <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                  Initializing PowerShell script...
                </Typography>
              </Box>
            )}
            {output.map((line, index) => {
              const style = formatTerminalLine(line);
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: showLineNumbers ? 2 : 0,
                    mb: 0.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  {showLineNumbers && (
                    <Typography
                      component="span"
                      sx={{
                        color: 'rgba(255,255,255,0.3)',
                        minWidth: 36,
                        textAlign: 'right',
                        userSelect: 'none',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Typography>
                  )}
                  <Typography
                    component="span"
                    sx={{
                      color: style.color,
                      fontWeight: style.fontWeight,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                    }}
                  >
                    {line}
                  </Typography>
                </Box>
              );
            })}
            {loading && output.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#00bcd4', mt: 1 }}>
                <CircularProgress size={12} sx={{ color: '#00bcd4' }} />
                <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>Processing...</Typography>
              </Box>
            )}
          </Box>

          {/* Scroll-to-bottom FAB */}
          {!isAtBottom && (
            <Fab
              size="small"
              onClick={scrollToBottom}
              data-testid="scroll-to-bottom"
              aria-label="Scroll to bottom"
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 24,
                bgcolor: '#3a3a3a',
                color: '#d4d4d4',
                '&:hover': { bgcolor: '#4a4a4a' },
              }}
            >
              <MaterialSymbol icon="keyboard_arrow_down" size={20} />
            </Fab>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default Terminal;

