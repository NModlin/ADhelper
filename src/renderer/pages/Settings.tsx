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
  CircularProgress,
  Skeleton,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { electronAPI, isElectron } from '../electronAPI';
import SiteManagement from '../components/SiteManagement';
import type { SiteConfig } from '../components/SiteManagement';
import { useNotification } from '../hooks/useNotification';
import { FormSkeleton } from '../components/ContentSkeleton';
import { HelpTooltip } from '../components/HelpTooltip';

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

  // Responsible Sites (Jira site-ownership tracking)
  const [allSites, setAllSites] = useState<SiteConfig[]>([]);
  const [responsibleSiteIds, setResponsibleSiteIds] = useState<string[]>([]);
  const [responsibleSitesLoading, setResponsibleSitesLoading] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  // Load credentials on mount
  useEffect(() => {
    Promise.all([loadJiraCredentials(), loadADCredentials(), loadResponsibleSites()])
      .finally(() => setCredentialsLoading(false));
  }, []);

  const loadJiraCredentials = async () => {
    try {
      const result = await electronAPI.getCredential('ADHelper_Jira');
      if (result.success && result.username) {
        // Username format: "url|email" — load public fields only; token stays in Credential Manager
        const [url, email] = result.username.split('|');
        setJiraUrl(url || '');
        setJiraEmail(email || '');
        // jiraApiToken is intentionally NOT populated from storage — the field is
        // write-only: the user enters a new token when they want to update it.
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

  const loadResponsibleSites = async () => {
    try {
      const [sitesResult, respResult] = await Promise.all([
        electronAPI.getSiteConfigs(),
        electronAPI.getResponsibleSites(),
      ]);
      if (sitesResult.success && sitesResult.sites) setAllSites(sitesResult.sites);
      if (respResult.success && respResult.siteIds) setResponsibleSiteIds(respResult.siteIds);
    } catch (err) {
      console.error('Failed to load responsible sites:', err);
    }
  };

  const handleToggleResponsibleSite = (siteId: string) => {
    setResponsibleSiteIds(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const handleSaveResponsibleSites = async () => {
    setResponsibleSitesLoading(true);
    try {
      const result = await electronAPI.saveResponsibleSites(responsibleSiteIds);
      if (result.success) {
        showSuccess('Responsible sites saved!');
      } else {
        showError(result.error || 'Failed to save responsible sites');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save responsible sites');
    } finally {
      setResponsibleSitesLoading(false);
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

  if (credentialsLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={450} height={24} sx={{ mb: 3 }} />
        <FormSkeleton sections={3} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" gutterBottom>
          Secure Credentials
        </Typography>
        <HelpTooltip
          title="Credential Storage"
          content={isElectron
            ? 'Credentials are encrypted and stored in Windows Credential Manager (OS-level encryption). They are never transmitted to external servers.'
            : 'Credential storage is not available in browser mode. Please use the desktop app for secure credential management.'}
        />
      </Box>
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
        <Alert severity="info" sx={{ mb: 3 }} icon={<MaterialSymbol icon="lock" />}>
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
                      aria-label={showJiraToken ? 'Hide API token' : 'Show API token'}
                    >
                      {showJiraToken ? <MaterialSymbol icon="visibility_off" /> : <MaterialSymbol icon="visibility" />}
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
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="save" />}
                onClick={handleSaveJira}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Jira Credentials'}
              </Button>
              {jiraLoaded && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="delete" />}
                  onClick={handleDeleteJira}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
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
                      aria-label={showAdPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdPassword ? <MaterialSymbol icon="visibility_off" /> : <MaterialSymbol icon="visibility" />}
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
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="save" />}
                onClick={handleSaveAD}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save AD Credentials'}
              </Button>
              {adLoaded && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="delete" />}
                  onClick={handleDeleteAD}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
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
            <SiteManagement onSitesChange={loadResponsibleSites} />
          </Paper>
        </Grid>

        {/* My Responsible Sites */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6">
                My Responsible Sites (Jira Tracking)
              </Typography>
              <HelpTooltip
                title="Responsible Sites"
                content="Select the sites you are in charge of. ADHelper will monitor open Jira tickets from those sites' projects and surface them in the Jira Updater page."
              />
            </Box>
            <Divider sx={{ mb: 2 }} />

            {allSites.length === 0 ? (
              <Alert severity="info">
                No sites configured yet. Add sites in <strong>Site Location Management</strong> above, then assign a Jira Project Key to each one to enable tracking.
              </Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Check the sites you are responsible for. Only sites with a Jira Project Key set will appear in ticket tracking.
                </Typography>
                <FormGroup>
                  {allSites.map((site) => (
                    <FormControlLabel
                      key={site.id}
                      control={
                        <Checkbox
                          checked={responsibleSiteIds.includes(site.id)}
                          onChange={() => handleToggleResponsibleSite(site.id)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{site.name}</span>
                          {site.jiraProjectKey
                            ? <Chip label={`Jira: ${site.jiraProjectKey}`} size="small" color="secondary" variant="outlined" />
                            : <Chip label="No Jira key" size="small" variant="outlined" sx={{ opacity: 0.5 }} />}
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
                <Button
                  variant="contained"
                  sx={{ mt: 2, bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
                  startIcon={responsibleSitesLoading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="save" />}
                  onClick={handleSaveResponsibleSites}
                  disabled={responsibleSitesLoading}
                >
                  {responsibleSitesLoading ? 'Saving…' : 'Save Responsible Sites'}
                </Button>
              </>
            )}
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

