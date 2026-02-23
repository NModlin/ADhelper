import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { electronAPI, isElectron } from '../electronAPI';
import SiteManagement from '../components/SiteManagement';
import { useNotification } from '../hooks/useNotification';

const Settings: React.FC = () => {
  const { showSuccess, showError, showWarning } = useNotification();

  // Jira Credentials
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [jiraLoaded, setJiraLoaded] = useState(false);

  // AD Credentials
  const [adUsername, setAdUsername] = useState('');
  const [adPassword, setAdPassword] = useState('');
  const [showAdPassword, setShowAdPassword] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);

  // Load credentials on mount
  useEffect(() => {
    loadJiraCredentials();
    loadADCredentials();
  }, []);

  const loadJiraCredentials = async () => {
    try {
      const result = await electronAPI.getCredential('ADHelper_Jira');
      if (result.success && result.username && result.password) {
        // Username format: "url|email"
        const [url, email] = result.username.split('|');
        setJiraUrl(url || '');
        setJiraEmail(email || '');
        setJiraApiToken(result.password || '');
        setJiraLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load Jira credentials:', err);
    }
  };

  const loadADCredentials = async () => {
    try {
      const result = await electronAPI.getCredential('ADHelper_ActiveDirectory');
      if (result.success && result.username && result.password) {
        setAdUsername(result.username);
        setAdPassword(result.password);
        setAdLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load AD credentials:', err);
    }
  };

  const handleSaveJira = async () => {
    if (!jiraUrl || !jiraEmail || !jiraApiToken) {
      showWarning('Please fill in all Jira fields');
      return;
    }

    setLoading(true);

    try {
      // Store URL and email in username field (separated by |)
      const username = `${jiraUrl}|${jiraEmail}`;
      const result = await electronAPI.saveCredential('ADHelper_Jira', username, jiraApiToken);

      if (result.success) {
        setJiraLoaded(true);
        showSuccess('Jira credentials saved successfully!');
      } else {
        showError(result.error || 'Failed to save Jira credentials');
      }
    } catch (err: any) {
      showError(err.error || 'Failed to save Jira credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAD = async () => {
    if (!adUsername || !adPassword) {
      showWarning('Please fill in all AD fields');
      return;
    }

    setLoading(true);

    try {
      const result = await electronAPI.saveCredential('ADHelper_ActiveDirectory', adUsername, adPassword);

      if (result.success) {
        setAdLoaded(true);
        showSuccess('AD credentials saved successfully!');
      } else {
        showError(result.error || 'Failed to save AD credentials');
      }
    } catch (err: any) {
      showError(err.error || 'Failed to save AD credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJira = async () => {
    setLoading(true);
    try {
      await electronAPI.deleteCredential('ADHelper_Jira');
      setJiraUrl('');
      setJiraEmail('');
      setJiraApiToken('');
      setJiraLoaded(false);
      showSuccess('Jira credentials deleted');
    } catch (err) {
      showError('Failed to delete Jira credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAD = async () => {
    setLoading(true);
    try {
      await electronAPI.deleteCredential('ADHelper_ActiveDirectory');
      setAdUsername('');
      setAdPassword('');
      setAdLoaded(false);
      showSuccess('AD credentials deleted');
    } catch (err) {
      showError('Failed to delete AD credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Secure Credentials
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your credentials securely using {isElectron ? 'Windows Credential Manager' : 'browser storage'}
      </Typography>

      {!isElectron && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Browser Mode:</strong> Credentials are stored in browser localStorage.
          For secure storage using Windows Credential Manager, please use the desktop app.
        </Alert>
      )}

      {isElectron && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<LockIcon />}>
          <strong>Secure Storage:</strong> Your credentials are encrypted and stored in Windows Credential Manager.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Jira Credentials */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Jira API Credentials
              </Typography>
              {jiraLoaded && (
                <Chip label="Saved" color="success" size="small" />
              )}
            </Box>
            <Divider sx={{ mb: 3 }} />

            <TextField
              fullWidth
              label="Jira URL"
              variant="outlined"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Jira Email"
              variant="outlined"
              type="email"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              placeholder="your-email@company.com"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Jira API Token"
              variant="outlined"
              type={showJiraToken ? 'text' : 'password'}
              value={jiraApiToken}
              onChange={(e) => setJiraApiToken(e.target.value)}
              placeholder="Your Jira API token"
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowJiraToken(!showJiraToken)}
                      edge="end"
                    >
                      {showJiraToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Get your API token from: Jira → Profile → Security → API Tokens
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveJira}
                disabled={loading}
              >
                Save Jira Credentials
              </Button>
              {jiraLoaded && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteJira}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* AD Credentials */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Active Directory Credentials
              </Typography>
              {adLoaded && (
                <Chip label="Saved" color="success" size="small" />
              )}
            </Box>
            <Divider sx={{ mb: 3 }} />

            <TextField
              fullWidth
              label="AD Username"
              variant="outlined"
              value={adUsername}
              onChange={(e) => setAdUsername(e.target.value)}
              placeholder="domain\\username or username@domain.com"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="AD Password"
              variant="outlined"
              type={showAdPassword ? 'text' : 'password'}
              value={adPassword}
              onChange={(e) => setAdPassword(e.target.value)}
              placeholder="Your AD password"
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowAdPassword(!showAdPassword)}
                      edge="end"
                    >
                      {showAdPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              These credentials will be used for Active Directory operations
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAD}
                disabled={loading}
              >
                Save AD Credentials
              </Button>
              {adLoaded && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteAD}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Site Location Management */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Site Location Management
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <SiteManagement />
          </Paper>
        </Grid>

        {/* About */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" paragraph>
              <strong>Version:</strong> 1.0.0
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Author:</strong> NModlin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ADHelper - Secure credential management for Active Directory and Jira
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;

