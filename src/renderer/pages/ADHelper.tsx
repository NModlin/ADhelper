import React, { useState } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import EmailIcon from '@mui/icons-material/Email';
import LicenseIcon from '@mui/icons-material/CardMembership';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { electronAPI, isElectron } from '../electronAPI';

const ADHelper: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter a username or email');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress([]);

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
          {loading && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Processing...
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto', mt: 2 }}>
                {progress.map((line, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
            </Paper>
          )}

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

          {!loading && !result && !error && (
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

