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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { electronAPI, isElectron } from '../electronAPI';

const ADHelper: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  // MFA Removal Dialog State
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaUsername, setMfaUsername] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaProgress, setMfaProgress] = useState<string[]>([]);
  const [mfaResult, setMfaResult] = useState<any>(null);

  // User Creation Dialog State
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userCreationLoading, setUserCreationLoading] = useState(false);
  const [userCreationProgress, setUserCreationProgress] = useState<string[]>([]);
  const [userCreationResult, setUserCreationResult] = useState<any>(null);
  const [newUserInfo, setNewUserInfo] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    ou: 'OU=Rehrig,OU=Accounts,DC=RPL,DC=Local',
    title: '',
    department: '',
    manager: '',
    managerEmail: '',
    siteLocation: '',
  });

  // Site configuration state
  const [siteConfigs, setSiteConfigs] = useState<any[]>([]);
  const [selectedSiteGroups, setSelectedSiteGroups] = useState<string[]>([]);

  // Job profile state
  const [jobProfiles, setJobProfiles] = useState<any[]>([]);
  const [selectedJobProfile, setSelectedJobProfile] = useState<string>('');
  const [selectedJobProfileGroups, setSelectedJobProfileGroups] = useState<any[]>([]);

  // Load site configurations on mount
  useEffect(() => {
    loadSiteConfigs();
  }, []);

  // Load job profiles when site location changes
  useEffect(() => {
    if (newUserInfo.siteLocation) {
      loadJobProfiles(newUserInfo.siteLocation);
    } else {
      setJobProfiles([]);
      setSelectedJobProfile('');
      setSelectedJobProfileGroups([]);
    }
  }, [newUserInfo.siteLocation]);

  // Update selected site groups when site location changes
  useEffect(() => {
    if (newUserInfo.siteLocation) {
      const site = siteConfigs.find(s => s.id === newUserInfo.siteLocation);
      setSelectedSiteGroups(site?.groups || []);
    } else {
      setSelectedSiteGroups([]);
    }
  }, [newUserInfo.siteLocation, siteConfigs]);

  // Update selected job profile groups when job profile changes
  useEffect(() => {
    if (selectedJobProfile) {
      const profile = jobProfiles.find(p => p.category === selectedJobProfile);
      setSelectedJobProfileGroups(profile?.groups || []);
    } else {
      setSelectedJobProfileGroups([]);
    }
  }, [selectedJobProfile, jobProfiles]);

  // Auto-scroll terminal to bottom when new content arrives
  useEffect(() => {
    if (terminalRef.current && showTerminal) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [progress, showTerminal]);

  const loadSiteConfigs = async () => {
    try {
      const result = await electronAPI.getSiteConfigs();
      if (result.success && result.sites) {
        setSiteConfigs(result.sites);
      }
    } catch (err) {
      console.error('Failed to load site configurations:', err);
    }
  };

  const loadJobProfiles = async (siteId: string) => {
    try {
      const result = await electronAPI.getJobProfiles(siteId);
      if (result.success && result.jobProfiles) {
        setJobProfiles(result.jobProfiles);
      } else {
        setJobProfiles([]);
      }
    } catch (err) {
      console.error('Failed to load job profiles:', err);
      setJobProfiles([]);
    }
  };

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

  // MFA Removal Handler
  const handleMFARemoval = async () => {
    if (!mfaUsername.trim()) {
      return;
    }

    setMfaLoading(true);
    setMfaProgress([]);
    setMfaResult(null);

    try {
      // Listen for progress updates
      electronAPI.onMFARemovalProgress((data: string) => {
        setMfaProgress(prev => [...prev, data]);
      });

      const response = await electronAPI.removeMFABlocking(mfaUsername);
      setMfaResult(response);
      setMfaLoading(false);
    } catch (err: any) {
      setMfaResult({ success: false, error: err.error || 'MFA removal failed' });
      setMfaLoading(false);
    } finally {
      electronAPI.removeMFARemovalProgressListener();
    }
  };

  // User Creation Handler
  const handleUserCreation = async () => {
    // Validate required fields
    if (!newUserInfo.firstName || !newUserInfo.lastName || !newUserInfo.username || !newUserInfo.email) {
      return;
    }

    setUserCreationLoading(true);
    setUserCreationProgress([]);
    setUserCreationResult(null);

    try {
      // Listen for progress updates
      electronAPI.onUserCreationProgress((data: string) => {
        setUserCreationProgress(prev => [...prev, data]);
      });

      // Prepare user info with job profile groups
      const userInfoWithJobProfile = {
        ...newUserInfo,
        jobProfileGroups: selectedJobProfileGroups.map(g => g.distinguishedName),
      };

      const response = await electronAPI.createNewUser(userInfoWithJobProfile);
      setUserCreationResult(response);
      setUserCreationLoading(false);
    } catch (err: any) {
      setUserCreationResult({ success: false, error: err.error || 'User creation failed' });
      setUserCreationLoading(false);
    } finally {
      electronAPI.removeUserCreationProgressListener();
    }
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
    { id: 'groups', label: 'Add to Standard Groups', icon: <GroupIcon />, color: '#0536B6' },
    { id: 'licenses', label: 'Assign M365 Licenses', icon: <LicenseIcon />, color: '#FFC20E' },
    { id: 'proxies', label: 'Configure Proxy Addresses', icon: <EmailIcon />, color: '#3283FE' },
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<LockOpenIcon />}
            sx={{
              borderColor: '#FFC20E',
              color: '#FFC20E',
              '&:hover': {
                borderColor: '#E6AD00',
                backgroundColor: 'rgba(255, 194, 14, 0.08)',
              },
            }}
            onClick={() => {
              setMfaDialogOpen(true);
              setMfaUsername('');
              setMfaResult(null);
              setMfaProgress([]);
            }}
          >
            Remove from MFA Blocking Group
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PersonAddIcon />}
            sx={{
              borderColor: '#0536B6',
              color: '#0536B6',
              '&:hover': {
                borderColor: '#003063',
                backgroundColor: 'rgba(5, 54, 182, 0.08)',
              },
            }}
            onClick={() => {
              setUserDialogOpen(true);
              setNewUserInfo({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                ou: 'OU=Rehrig,OU=Accounts,DC=RPL,DC=Local',
                title: '',
                department: '',
                manager: '',
                managerEmail: '',
                siteLocation: '',
              });
              setUserCreationResult(null);
              setUserCreationProgress([]);
            }}
          >
            Create New User Account
          </Button>
        </Grid>
      </Grid>

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
                    <ListItemIcon sx={{ color: op.color }}>{op.icon}</ListItemIcon>
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

      {/* MFA Removal Dialog */}
      <Dialog open={mfaDialogOpen} onClose={() => !mfaLoading && setMfaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#FFC20E', color: '#003063' }}>
          Remove from MFA Blocking Group
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!mfaResult && (
            <>
              <TextField
                fullWidth
                label="Username or Email"
                variant="outlined"
                value={mfaUsername}
                onChange={(e) => setMfaUsername(e.target.value)}
                placeholder="e.g., jsmith or jsmith@company.com"
                disabled={mfaLoading}
                sx={{ mb: 2 }}
              />
              {mfaLoading && <LinearProgress sx={{ mb: 2 }} />}
              {mfaProgress.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '0.875rem', maxHeight: 300, overflow: 'auto' }}>
                  {mfaProgress.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </Paper>
              )}
            </>
          )}
          {mfaResult && (
            <Alert severity={mfaResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
              {mfaResult.success ? 'User successfully removed from MFA Blocking Group!' : mfaResult.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {!mfaResult && (
            <>
              <Button onClick={() => setMfaDialogOpen(false)} disabled={mfaLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleMFARemoval}
                variant="contained"
                disabled={mfaLoading || !mfaUsername.trim()}
                sx={{ bgcolor: '#FFC20E', color: '#003063', '&:hover': { bgcolor: '#E6AD00' } }}
              >
                {mfaLoading ? 'Removing...' : 'Remove from Group'}
              </Button>
            </>
          )}
          {mfaResult && (
            <Button onClick={() => setMfaDialogOpen(false)} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* User Creation Dialog */}
      <Dialog open={userDialogOpen} onClose={() => !userCreationLoading && setUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0536B6', color: 'white' }}>
          Create New User Account
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!userCreationResult && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    variant="outlined"
                    value={newUserInfo.firstName}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, firstName: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    variant="outlined"
                    value={newUserInfo.lastName}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, lastName: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username *"
                    variant="outlined"
                    value={newUserInfo.username}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, username: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email *"
                    variant="outlined"
                    value={newUserInfo.email}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, email: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Organizational Unit *"
                    variant="outlined"
                    value={newUserInfo.ou}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, ou: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title (Optional)"
                    variant="outlined"
                    value={newUserInfo.title}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, title: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Department (Optional)"
                    variant="outlined"
                    value={newUserInfo.department}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, department: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Manager DN (Optional)"
                    variant="outlined"
                    value={newUserInfo.manager}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, manager: e.target.value })}
                    disabled={userCreationLoading}
                    placeholder="e.g., CN=John Doe,OU=Users,DC=RPL,DC=Local"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Manager Email (Optional)"
                    variant="outlined"
                    type="email"
                    value={newUserInfo.managerEmail}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, managerEmail: e.target.value })}
                    disabled={userCreationLoading}
                    placeholder="e.g., manager@rehrig.com"
                    helperText="If no Manager DN is provided, enter the manager's email to receive credentials"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Site Location (Optional)</InputLabel>
                    <Select
                      value={newUserInfo.siteLocation}
                      onChange={(e) => setNewUserInfo({ ...newUserInfo, siteLocation: e.target.value })}
                      label="Site Location (Optional)"
                      disabled={userCreationLoading}
                    >
                      <MenuItem value="">
                        <em>Default Groups Only</em>
                      </MenuItem>
                      {siteConfigs.map((site) => (
                        <MenuItem key={site.id} value={site.id}>
                          {site.name} ({site.groups.length} additional groups)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Job Category Selection (only for sites with job profiles) */}
                {jobProfiles.length > 0 && (
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Job Category (Optional)</InputLabel>
                      <Select
                        value={selectedJobProfile}
                        onChange={(e) => setSelectedJobProfile(e.target.value)}
                        label="Job Category (Optional)"
                        disabled={userCreationLoading}
                      >
                        <MenuItem value="">
                          <em>No Job Category</em>
                        </MenuItem>
                        {jobProfiles.map((profile, idx) => (
                          <MenuItem key={idx} value={profile.category}>
                            {profile.category} ({profile.groups.length} groups)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {selectedSiteGroups.length > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon="📍">
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Site Groups for {siteConfigs.find(s => s.id === newUserInfo.siteLocation)?.name}:</strong>
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {selectedSiteGroups.map((group, idx) => (
                          <Chip
                            key={idx}
                            label={group.split(',')[0].replace('CN=', '')}
                            size="small"
                            color="primary"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {selectedSiteGroups.length} site-specific group(s)
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {selectedJobProfileGroups.length > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="success" icon="💼">
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Job Profile Groups for {selectedJobProfile}:</strong>
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {selectedJobProfileGroups.map((group, idx) => (
                          <Chip
                            key={idx}
                            label={group.name}
                            size="small"
                            color="success"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {selectedJobProfileGroups.length} job-specific group(s)
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {(selectedSiteGroups.length > 0 || selectedJobProfileGroups.length > 0) && (
                  <Grid item xs={12}>
                    <Alert severity="warning" icon="📊">
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Total Groups Summary:</strong>
                      </Typography>
                      <Typography variant="body2">
                        • 10 default groups (standard for all users)<br />
                        {selectedSiteGroups.length > 0 && `• ${selectedSiteGroups.length} site-specific groups\n`}
                        {selectedJobProfileGroups.length > 0 && `• ${selectedJobProfileGroups.length} job profile groups\n`}
                        <strong>Total: {10 + selectedSiteGroups.length + selectedJobProfileGroups.length} groups</strong> (after deduplication)
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
              {userCreationLoading && <LinearProgress sx={{ mt: 2 }} />}
              {userCreationProgress.length > 0 && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '0.875rem', maxHeight: 200, overflow: 'auto' }}>
                  {userCreationProgress.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </Paper>
              )}
            </>
          )}
          {userCreationResult && (
            <>
              <Alert severity={userCreationResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {userCreationResult.success ? 'User account created successfully!' : userCreationResult.error}
              </Alert>
              {userCreationResult.success && userCreationResult.result && (
                <>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body2"><strong>Username:</strong> {userCreationResult.result.Username}</Typography>
                    <Typography variant="body2"><strong>Email:</strong> {userCreationResult.result.Email}</Typography>
                    <Typography variant="body2" sx={{ color: '#d32f2f', mt: 1 }}>
                      <strong>Temporary Password:</strong> {userCreationResult.result.Password}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      ⚠️ User must change password at first logon.
                    </Typography>
                  </Paper>

                  {/* Email Status */}
                  {userCreationResult.result.EmailSent && (
                    <Alert severity="success" icon="📧" sx={{ mb: 2 }}>
                      <strong>Email Sent Successfully!</strong><br />
                      Credentials have been sent to the manager at: {userCreationResult.result.ManagerEmail}
                    </Alert>
                  )}
                  {userCreationResult.result.ManagerEmail && !userCreationResult.result.EmailSent && (
                    <Alert severity="warning" icon="⚠️" sx={{ mb: 2 }}>
                      <strong>Email Delivery Failed</strong><br />
                      Could not send credentials to manager ({userCreationResult.result.ManagerEmail}). Please provide credentials manually.
                    </Alert>
                  )}
                  {!userCreationResult.result.ManagerEmail && (newUserInfo.manager || newUserInfo.managerEmail) && (
                    <Alert severity="info" icon="ℹ️" sx={{ mb: 2 }}>
                      <strong>No Manager Email</strong><br />
                      Could not retrieve or send to manager email address. Please provide credentials to the manager manually.
                    </Alert>
                  )}
                  {!newUserInfo.manager && !newUserInfo.managerEmail && (
                    <Alert severity="info" icon="ℹ️" sx={{ mb: 2 }}>
                      <strong>No Manager Specified</strong><br />
                      Please provide the temporary password to the employee securely.
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!userCreationResult && (
            <>
              <Button onClick={() => setUserDialogOpen(false)} disabled={userCreationLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleUserCreation}
                variant="contained"
                disabled={userCreationLoading || !newUserInfo.firstName || !newUserInfo.lastName || !newUserInfo.username || !newUserInfo.email}
                sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
              >
                {userCreationLoading ? 'Creating...' : 'Create User'}
              </Button>
            </>
          )}
          {userCreationResult && (
            <Button onClick={() => setUserDialogOpen(false)} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ADHelper;

