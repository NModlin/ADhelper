import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import EmailIcon from '@mui/icons-material/Email';
import LicenseIcon from '@mui/icons-material/CardMembership';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ClearIcon from '@mui/icons-material/Clear';
import { electronAPI, isElectron } from '../electronAPI';

const ADHelper: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom when new content arrives
  useEffect(() => {
    if (terminalRef.current && showTerminal) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [progress, showTerminal]);

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter a username or email');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress([]);
    setShowTerminal(true); // Auto-show terminal when processing starts

    try {
      // Listen for progress updates
      electronAPI.onADHelperProgress((data: string) => {
        setProgress(prev => [...prev, data]);
      });

      const response = await electronAPI.runADHelperScript(username, 'process');

      setResult(response);
      setLoading(false);
    } catch (err: any) {
      setError(err.error || 'An error occurred while processing the user');
      setLoading(false);
    } finally {
      electronAPI.removeADHelperProgressListener();
    }
  };

  const clearTerminal = () => {
    setProgress([]);
  };

  const formatTerminalLine = (line: string) => {
    // Parse ANSI color codes and PowerShell formatting
    let color = 'inherit';
    let fontWeight = 'normal';

    // Check for common PowerShell output patterns
    if (line.includes('✅') || line.includes('SUCCESS')) {
      color = '#4caf50'; // Green
    } else if (line.includes('❌') || line.includes('ERROR') || line.includes('Failed')) {
      color = '#f44336'; // Red
    } else if (line.includes('⚠️') || line.includes('WARNING') || line.includes('WARN')) {
      color = '#ff9800'; // Orange
    } else if (line.includes('💡') || line.includes('INFO')) {
      color = '#2196f3'; // Blue
    } else if (line.includes('🔍') || line.includes('Checking')) {
      color = '#00bcd4'; // Cyan
    } else if (line.includes('===') || line.includes('---')) {
      color = '#9e9e9e'; // Gray
      fontWeight = 'bold';
    }

    return { color, fontWeight };
  };

  const operations = [
    { id: 'groups', label: 'Add to Standard Groups', icon: <GroupIcon /> },
    { id: 'licenses', label: 'Assign M365 Licenses', icon: <LicenseIcon /> },
    { id: 'proxies', label: 'Configure Proxy Addresses', icon: <EmailIcon /> },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Active Directory Helper
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage user groups, licenses, and proxy addresses
      </Typography>

      {!isElectron && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You are running in browser mode. AD operations require the desktop app. Please download and install the desktop version.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Username or Email"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., jsmith or jsmith@company.com"
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Process User'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Terminal Output Section */}
      {(loading || progress.length > 0) && (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#fff',
              borderBottom: showTerminal ? '1px solid #333' : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon />
              <Typography variant="h6">
                PowerShell Terminal Output
              </Typography>
              {loading && (
                <Chip
                  label="Running"
                  size="small"
                  color="primary"
                  icon={<CircularProgress size={12} sx={{ color: 'white !important' }} />}
                />
              )}
              {!loading && progress.length > 0 && (
                <Chip label="Completed" size="small" color="success" />
              )}
            </Box>
            <Box>
              <Tooltip title="Clear terminal">
                <IconButton
                  size="small"
                  onClick={clearTerminal}
                  sx={{ color: 'white', mr: 1 }}
                  disabled={loading}
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={showTerminal ? 'Collapse terminal' : 'Expand terminal'}>
                <IconButton
                  size="small"
                  onClick={() => setShowTerminal(!showTerminal)}
                  sx={{ color: 'white' }}
                >
                  {showTerminal ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Collapse in={showTerminal}>
            <Box
              ref={terminalRef}
              sx={{
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                p: 2,
                fontFamily: '"Consolas", "Courier New", monospace',
                fontSize: '13px',
                maxHeight: 500,
                minHeight: 200,
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#2d2d2d',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#555',
                  borderRadius: '5px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#777',
                },
              }}
            >
              {progress.length === 0 && loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#00bcd4' }}>
                  <CircularProgress size={16} sx={{ color: '#00bcd4' }} />
                  <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                    Initializing PowerShell script...
                  </Typography>
                </Box>
              )}
              {progress.map((line, index) => {
                const style = formatTerminalLine(line);
                return (
                  <Box
                    key={index}
                    sx={{
                      color: style.color,
                      fontWeight: style.fontWeight,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                      mb: 0.5,
                    }}
                  >
                    {line}
                  </Box>
                );
              })}
              {loading && progress.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#00bcd4', mt: 1 }}>
                  <CircularProgress size={12} sx={{ color: '#00bcd4' }} />
                  <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                    Processing...
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Operations
              </Typography>
              <List>
                {operations.map((op) => (
                  <ListItem key={op.id}>
                    <ListItemIcon>{op.icon}</ListItemIcon>
                    <ListItemText primary={op.label} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {result && !loading && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Operation Completed Successfully
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {result.output}
              </Typography>
            </Paper>
          )}

          {!loading && !result && !error && progress.length === 0 && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Enter a username to get started
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ADHelper;

