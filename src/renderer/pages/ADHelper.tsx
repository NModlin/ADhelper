import React, { useState, useEffect, useRef } from 'react';
import { isValidUsernameOrEmail, isValidName, isValidEmail, isValidDN } from '../utils/validation';
import { useNotification } from '../hooks/useNotification';
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

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ClearIcon from '@mui/icons-material/Clear';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import BadgeIcon from '@mui/icons-material/Badge';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import { electronAPI, isElectron } from '../electronAPI';

/** Extract a percentage (0–100) from a PowerShell progress line, or return null */
function parseProgressPercent(line: string): number | null {
  // Match "XX% complete", "Progress: XX%", "[XX%]", "XX %" patterns
  const m = line.match(/(\d{1,3})\s*%/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 0 && n <= 100) return n;
  }
  // Match "Step X of Y" / "Processing X/Y" patterns
  const stepMatch = line.match(/(?:step|processing|item)\s+(\d+)\s*(?:of|\/)\s*(\d+)/i);
  if (stepMatch) {
    const current = parseInt(stepMatch[1], 10);
    const total = parseInt(stepMatch[2], 10);
    if (total > 0) return Math.round((current / total) * 100);
  }
  return null;
}

const ADHelper: React.FC = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
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

  // Contractor Account Extension Dialog State
  const [contractorDialogOpen, setContractorDialogOpen] = useState(false);
  const [contractorUsernames, setContractorUsernames] = useState('');
  const [contractorLoading, setContractorLoading] = useState(false);
  const [contractorProgress, setContractorProgress] = useState<string[]>([]);
  const [contractorResult, setContractorResult] = useState<any>(null);

  // Bulk User Processing Dialog State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkUsernames, setBulkUsernames] = useState('');
  const [bulkMode, setBulkMode] = useState<string>('all');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // Site configuration state
  const [siteConfigs, setSiteConfigs] = useState<any[]>([]);
  const [selectedSiteGroups, setSelectedSiteGroups] = useState<string[]>([]);

  // Job profile state
  const [jobProfiles, setJobProfiles] = useState<any[]>([]);
  const [selectedJobProfile, setSelectedJobProfile] = useState<string>('');
  const [selectedJobProfileGroups, setSelectedJobProfileGroups] = useState<any[]>([]);

  // RBAC state
  const [userRole, setUserRole] = useState<string>('admin');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  // Load site configurations and user role on mount
  useEffect(() => {
    loadSiteConfigs();
    loadUserRole();
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

  const loadUserRole = async () => {
    try {
      const result = await electronAPI.getUserRole();
      if (result.success && result.role) {
        setUserRole(result.role);
      }
    } catch (err) {
      console.error('Failed to load user role:', err);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    try {
      const result = await electronAPI.setUserRole(newRole);
      if (result.success) {
        setUserRole(newRole);
      } else {
        showError(result.error || 'Failed to change role');
      }
    } catch (err: any) {
      showError(err.error || 'Failed to change role');
    }
  };

  const handleSearch = async () => {
    if (!username.trim()) {
      showWarning('Please enter a username or email');
      return;
    }

    if (!isValidUsernameOrEmail(username.trim())) {
      showWarning('Invalid username or email format. Use only letters, numbers, dots, hyphens, underscores, and @.');
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress([]);
    setProgressPercent(null);
    setShowTerminal(true); // Auto-show terminal when processing starts

    try {
      // Listen for progress updates
      electronAPI.onADHelperProgress((data: string) => {
        setProgress(prev => [...prev, data]);
        const pct = parseProgressPercent(data);
        if (pct !== null) setProgressPercent(pct);
      });

      const response = await electronAPI.runADHelperScript(username.trim(), 'process');

      setResult(response);
      setLoading(false);
    } catch (err: any) {
      showError(err.error || 'An error occurred while processing the user');
      setLoading(false);
    } finally {
      electronAPI.removeADHelperProgressListener();
    }
  };

  const clearTerminal = () => {
    setProgress([]);
    setProgressPercent(null);
  };

  // MFA Removal Handler
  const handleMFARemoval = async () => {
    if (!mfaUsername.trim()) {
      return;
    }

    if (!isValidUsernameOrEmail(mfaUsername.trim())) {
      setMfaResult({ success: false, error: 'Invalid username format. Use only letters, numbers, dots, hyphens, underscores, and @.' });
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

      const response = await electronAPI.removeMFABlocking(mfaUsername.trim());
      // The response is { success: true, result: { Success, WasInGroup, Message, ... } }
      // Map the inner result to a flat structure for the UI
      if (response.result) {
        setMfaResult({
          success: response.result.Success === true,
          wasInGroup: response.result.WasInGroup,
          message: response.result.Message,
          errorType: response.result.ErrorType,
          displayName: response.result.DisplayName,
          error: response.result.Error || response.result.Message,
        });
      } else {
        setMfaResult(response);
      }
      setMfaLoading(false);
    } catch (err: any) {
      const errorMsg = err?.error || err?.message || (typeof err === 'string' ? err : 'MFA removal failed — check Settings to ensure admin credentials are configured.');
      setMfaResult({ success: false, error: errorMsg });
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

    // Validate field formats (defense-in-depth)
    const validationErrors: string[] = [];
    if (!isValidName(newUserInfo.firstName)) validationErrors.push('First name contains invalid characters');
    if (!isValidName(newUserInfo.lastName)) validationErrors.push('Last name contains invalid characters');
    if (!isValidUsernameOrEmail(newUserInfo.username)) validationErrors.push('Username contains invalid characters');
    if (!isValidEmail(newUserInfo.email)) validationErrors.push('Email address is not valid');
    if (newUserInfo.ou && !isValidDN(newUserInfo.ou)) validationErrors.push('OU path is not a valid distinguished name');
    if (newUserInfo.manager && !isValidDN(newUserInfo.manager)) validationErrors.push('Manager DN is not valid');
    if (newUserInfo.managerEmail && !isValidEmail(newUserInfo.managerEmail)) validationErrors.push('Manager email is not valid');

    if (validationErrors.length > 0) {
      setUserCreationResult({ success: false, error: validationErrors.join('. ') });
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

  // Contractor Account Extension Handler
  const handleContractorProcessing = async () => {
    const usernamesArray = contractorUsernames.split(';').map(u => u.trim()).filter(u => u);
    if (usernamesArray.length === 0) {
      return;
    }

    setContractorLoading(true);
    setContractorProgress([]);
    setContractorResult(null);

    try {
      electronAPI.onContractorProcessingProgress((data: string) => {
        setContractorProgress(prev => [...prev, data]);
      });

      const response = await electronAPI.processContractorAccount(usernamesArray);
      setContractorResult(response);
      setContractorLoading(false);
    } catch (err: any) {
      setContractorResult({ success: false, error: err.error || 'Contractor processing failed' });
      setContractorLoading(false);
    } finally {
      electronAPI.removeContractorProcessingProgressListener();
    }
  };

  // Bulk User Processing Handler
  const handleBulkProcessing = async () => {
    const usernamesArray = bulkUsernames.split(/[;\n,]/).map(u => u.trim()).filter(u => u);
    if (usernamesArray.length === 0) {
      return;
    }

    setBulkLoading(true);
    setBulkProgress([]);
    setBulkResult(null);

    try {
      electronAPI.onBulkProcessingProgress((data: string) => {
        setBulkProgress(prev => [...prev, data]);
      });

      const response = await electronAPI.processBulkUsers(usernamesArray, bulkMode);
      setBulkResult(response);
      setBulkLoading(false);
    } catch (err: any) {
      setBulkResult({ success: false, error: err.error || 'Bulk processing failed' });
      setBulkLoading(false);
    } finally {
      electronAPI.removeBulkProcessingProgressListener();
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
    { id: 'proxies', label: 'Configure Proxy Addresses', icon: <EmailIcon />, color: '#3283FE' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            Active Directory Helper
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage user groups and proxy addresses
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<SecurityIcon />}
            label={userRole === 'admin' ? 'Admin' : 'Operator'}
            color={userRole === 'admin' ? 'primary' : 'default'}
            variant="outlined"
            size="small"
            onClick={() => isAdmin && setRoleDialogOpen(true)}
            sx={{ cursor: isAdmin ? 'pointer' : 'default' }}
          />
        </Box>
      </Box>

      {!isElectron && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You are running in browser mode. AD operations require the desktop app. Please download and install the desktop version.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
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
          <Grid size={{ xs: 12, md: 4 }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip title={!isAdmin ? 'Admin role required' : ''}>
            <span>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                disabled={!isAdmin}
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
            </span>
          </Tooltip>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip title={!isAdmin ? 'Admin role required' : ''}>
            <span>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                disabled={!isAdmin}
                startIcon={<BadgeIcon />}
                sx={{
                  borderColor: '#0536B6',
                  color: '#0536B6',
                  '&:hover': {
                    borderColor: '#003063',
                    backgroundColor: 'rgba(5, 54, 182, 0.08)',
                  },
                }}
                onClick={() => {
                  setContractorDialogOpen(true);
                  setContractorUsernames('');
                  setContractorResult(null);
                  setContractorProgress([]);
                }}
              >
                Process Contractor Accounts
              </Button>
            </span>
          </Tooltip>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip title={!isAdmin ? 'Admin role required' : ''}>
            <span>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                disabled={!isAdmin}
                startIcon={<PeopleIcon />}
                sx={{
                  borderColor: '#0536B6',
                  color: '#0536B6',
                  '&:hover': {
                    borderColor: '#003063',
                    backgroundColor: 'rgba(5, 54, 182, 0.08)',
                  },
                }}
                onClick={() => {
                  setBulkDialogOpen(true);
                  setBulkUsernames('');
                  setBulkMode('all');
                  setBulkResult(null);
                  setBulkProgress([]);
                }}
              >
                Bulk User Processing
              </Button>
            </span>
          </Tooltip>
        </Grid>
      </Grid>

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
          {/* Native progress bar — parsed from PowerShell Write-Progress output */}
          {loading && progressPercent !== null && (
            <Box sx={{ px: 2, py: 1, bgcolor: '#1e1e1e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" sx={{ color: '#d4d4d4', minWidth: 40, textAlign: 'right' }}>
                  {progressPercent}%
                </Typography>
              </Box>
            </Box>
          )}
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
        <Grid size={{ xs: 12, md: 4 }}>
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

        <Grid size={{ xs: 12, md: 8 }}>
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

          {!loading && !result && progress.length === 0 && (
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
            <>
              <Alert severity={mfaResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {mfaResult.success && mfaResult.wasInGroup && (
                  <>User <strong>{mfaResult.displayName || mfaUsername}</strong> successfully removed from MFA Blocking Group!</>
                )}
                {mfaResult.success && !mfaResult.wasInGroup && (
                  <>User <strong>{mfaResult.displayName || mfaUsername}</strong> is not in the MFA Blocking Group — no action needed.</>
                )}
                {!mfaResult.success && (mfaResult.error || 'MFA removal failed')}
              </Alert>
              {mfaResult.success && mfaResult.wasInGroup && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Due to AD replication, this change may take up to 35 minutes to propagate across all domain controllers.
                </Alert>
              )}
              {mfaProgress.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.8rem', maxHeight: 200, overflow: 'auto' }}>
                  {mfaProgress.map((line, idx) => {
                    const style = formatTerminalLine(line);
                    return (
                      <Box key={idx} sx={{ color: style.color, fontWeight: style.fontWeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, mb: 0.25 }}>
                        {line}
                      </Box>
                    );
                  })}
                </Paper>
              )}
            </>
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    variant="outlined"
                    value={newUserInfo.firstName}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, firstName: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    variant="outlined"
                    value={newUserInfo.lastName}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, lastName: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Username *"
                    variant="outlined"
                    value={newUserInfo.username}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, username: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Email *"
                    variant="outlined"
                    value={newUserInfo.email}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, email: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Organizational Unit *"
                    variant="outlined"
                    value={newUserInfo.ou}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, ou: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Title (Optional)"
                    variant="outlined"
                    value={newUserInfo.title}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, title: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Department (Optional)"
                    variant="outlined"
                    value={newUserInfo.department}
                    onChange={(e) => setNewUserInfo({ ...newUserInfo, department: e.target.value })}
                    disabled={userCreationLoading}
                  />
                </Grid>
                <Grid size={12}>
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
                <Grid size={12}>
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
                <Grid size={12}>
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
                  <Grid size={12}>
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
                  <Grid size={12}>
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
                  <Grid size={12}>
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
                  <Grid size={12}>
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

      {/* Contractor Account Extension Dialog */}
      <Dialog open={contractorDialogOpen} onClose={() => !contractorLoading && setContractorDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0536B6', color: 'white' }}>
          Process Contractor Accounts
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!contractorResult && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Validates contractor users, verifies they are in the Non-Rehrig OU, updates Display Name
                with &quot; - Contractor&quot; suffix, and extends account expiration by 1 year.
              </Typography>
              <TextField
                fullWidth
                label="Username(s)"
                variant="outlined"
                value={contractorUsernames}
                onChange={(e) => setContractorUsernames(e.target.value)}
                placeholder="e.g., jsmith ; mjohnson ; bwilson"
                helperText="Enter one or more sAMAccountNames separated by semicolons (;). Email addresses are also accepted."
                disabled={contractorLoading}
                multiline
                minRows={2}
                maxRows={4}
                sx={{ mb: 2 }}
              />
              {contractorLoading && <LinearProgress sx={{ mb: 2 }} />}
              {contractorProgress.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.8rem', maxHeight: 300, overflow: 'auto' }}>
                  {contractorProgress.map((line, idx) => {
                    const style = formatTerminalLine(line);
                    return (
                      <Box key={idx} sx={{ color: style.color, fontWeight: style.fontWeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, mb: 0.25 }}>
                        {line}
                      </Box>
                    );
                  })}
                </Paper>
              )}
            </>
          )}
          {contractorResult && (
            <>
              <Alert severity={contractorResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {contractorResult.success
                  ? 'Contractor accounts processed successfully!'
                  : contractorResult.error || 'Some errors occurred during processing.'}
              </Alert>
              {contractorResult.result?.Stats && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom><strong>Processing Summary</strong></Typography>
                  <Typography variant="body2">Users found &amp; processed: <strong>{contractorResult.result.Stats.UsersFound}</strong></Typography>
                  <Typography variant="body2">Users skipped: <strong>{contractorResult.result.Stats.UsersSkipped}</strong></Typography>
                  <Typography variant="body2">In correct OU: <strong>{contractorResult.result.Stats.UsersInCorrectOU}</strong></Typography>
                  <Typography variant="body2">Display names updated: <strong>{contractorResult.result.Stats.DisplayNamesUpdated}</strong></Typography>
                  <Typography variant="body2">Display names already correct: <strong>{contractorResult.result.Stats.DisplayNamesAlreadyCorrect}</strong></Typography>
                  <Typography variant="body2">Expirations extended: <strong>{contractorResult.result.Stats.ExpirationsExtended}</strong></Typography>
                  {contractorResult.result.Stats.Errors > 0 && (
                    <Typography variant="body2" sx={{ color: '#d32f2f', mt: 1 }}>
                      Errors: <strong>{contractorResult.result.Stats.Errors}</strong>
                    </Typography>
                  )}
                </Paper>
              )}
              {contractorProgress.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.8rem', maxHeight: 200, overflow: 'auto' }}>
                  {contractorProgress.map((line, idx) => {
                    const style = formatTerminalLine(line);
                    return (
                      <Box key={idx} sx={{ color: style.color, fontWeight: style.fontWeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, mb: 0.25 }}>
                        {line}
                      </Box>
                    );
                  })}
                </Paper>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!contractorResult && (
            <>
              <Button onClick={() => setContractorDialogOpen(false)} disabled={contractorLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleContractorProcessing}
                variant="contained"
                disabled={contractorLoading || !contractorUsernames.trim()}
                sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
              >
                {contractorLoading ? 'Processing...' : 'Process Contractors'}
              </Button>
            </>
          )}
          {contractorResult && (
            <Button onClick={() => setContractorDialogOpen(false)} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk User Processing Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => !bulkLoading && setBulkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0536B6', color: 'white' }}>
          Bulk User Processing
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!bulkResult && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Process multiple users at once: add them to standard AD groups and/or fix their proxy (email) addresses.
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="bulk-mode-label">Processing Mode</InputLabel>
                <Select
                  labelId="bulk-mode-label"
                  value={bulkMode}
                  label="Processing Mode"
                  onChange={(e) => setBulkMode(e.target.value)}
                  disabled={bulkLoading}
                >
                  <MenuItem value="all">All — Groups + Proxy Addresses</MenuItem>
                  <MenuItem value="groupsOnly">Groups Only</MenuItem>
                  <MenuItem value="proxiesOnly">Proxy Addresses Only</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Usernames (one per line, or separated by commas/semicolons)"
                placeholder={"jsmith\njdoe\nmbrown"}
                value={bulkUsernames}
                onChange={(e) => setBulkUsernames(e.target.value)}
                disabled={bulkLoading}
                sx={{ mb: 2 }}
              />
            </>
          )}

          {/* Progress display */}
          {bulkLoading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Processing users...</Typography>
            </Box>
          )}

          {bulkProgress.length > 0 && (
            <Box sx={{
              bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
              maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem',
              mb: 2,
            }}>
              {bulkProgress.map((line, idx) => {
                const style = formatTerminalLine(line);
                return (
                  <Box key={idx} sx={{ color: style.color, fontWeight: style.fontWeight, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, mb: 0.25 }}>
                    {line}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Results summary */}
          {bulkResult && (
            <Box>
              <Alert severity={bulkResult.success ? 'success' : bulkResult.Stats?.Errors > 0 ? 'warning' : 'error'} sx={{ mb: 2 }}>
                {bulkResult.success
                  ? 'Bulk processing completed successfully!'
                  : bulkResult.error || 'Bulk processing completed with errors.'}
              </Alert>
              {bulkResult.Stats && (
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">Users Processed:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight="bold">{bulkResult.Stats.TotalProcessed}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">Groups Added:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight="bold" color="success.main">{bulkResult.Stats.GroupsAdded}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">Already Member:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">{bulkResult.Stats.GroupsAlreadyMember}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">Proxies Added:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight="bold" color="success.main">{bulkResult.Stats.ProxiesAdded}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">Proxies Already OK:</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2">{bulkResult.Stats.ProxiesAlreadyOk}</Typography></Grid>
                    {bulkResult.Stats.Errors > 0 && (
                      <>
                        <Grid size={{ xs: 6 }}><Typography variant="body2">Errors:</Typography></Grid>
                        <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight="bold" color="error.main">{bulkResult.Stats.Errors}</Typography></Grid>
                      </>
                    )}
                    {bulkResult.Stats.UsersNotFound > 0 && (
                      <>
                        <Grid size={{ xs: 6 }}><Typography variant="body2">Users Not Found:</Typography></Grid>
                        <Grid size={{ xs: 6 }}><Typography variant="body2" fontWeight="bold" color="error.main">{bulkResult.Stats.UsersNotFound}</Typography></Grid>
                      </>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!bulkResult && (
            <>
              <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkProcessing}
                variant="contained"
                disabled={bulkLoading || !bulkUsernames.trim()}
                sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
              >
                {bulkLoading ? 'Processing...' : 'Process Users'}
              </Button>
            </>
          )}
          {bulkResult && (
            <Button onClick={() => setBulkDialogOpen(false)} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Role Management Dialog (Admin only) */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0536B6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            Role Management
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set the permission level for this workstation. <strong>Operators</strong> can process existing users and remove MFA blocking.
            <strong> Admins</strong> can additionally create users, process contractors, and run bulk operations.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={userRole}
              label="Role"
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <MenuItem value="admin">Admin — Full Access</MenuItem>
              <MenuItem value="operator">Operator — Standard Operations Only</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            Current role: <strong>{userRole === 'admin' ? 'Admin' : 'Operator'}</strong>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ADHelper;

