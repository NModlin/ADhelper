import React, { useState, useEffect, useMemo } from 'react';
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
  useTheme,
} from '@mui/material';
import { MaterialSymbol } from '../components/MaterialSymbol';
import StepperForm, { type FormStep } from '../components/StepperForm';
import { PageSkeleton } from '../components/ContentSkeleton';
import Terminal from '../components/Terminal';
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
  const theme = useTheme();
  const { showError, showWarning } = useNotification();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);

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
  const [userCreationStep, setUserCreationStep] = useState(0);
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

  // Initial loading state
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Multi-step user creation form ──
  const userCreationSteps = useMemo<FormStep[]>(() => [
    {
      label: 'Basic Info',
      icon: 'person',
      content: (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="First Name *" variant="outlined" value={newUserInfo.firstName}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, firstName: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Last Name *" variant="outlined" value={newUserInfo.lastName}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, lastName: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Username *" variant="outlined" value={newUserInfo.username}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, username: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Email *" variant="outlined" value={newUserInfo.email}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, email: e.target.value })} disabled={userCreationLoading} />
          </Grid>
        </Grid>
      ),
      validate: () => {
        const errs: string[] = [];
        if (!newUserInfo.firstName.trim()) errs.push('First name is required');
        if (!newUserInfo.lastName.trim()) errs.push('Last name is required');
        if (!newUserInfo.username.trim()) errs.push('Username is required');
        if (!newUserInfo.email.trim()) errs.push('Email is required');
        return errs.length ? errs : undefined;
      },
    },
    {
      label: 'Organization',
      icon: 'corporate_fare',
      content: (
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth label="Organizational Unit *" variant="outlined" value={newUserInfo.ou}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, ou: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Title (Optional)" variant="outlined" value={newUserInfo.title}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, title: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Department (Optional)" variant="outlined" value={newUserInfo.department}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, department: e.target.value })} disabled={userCreationLoading} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Manager DN (Optional)" variant="outlined" value={newUserInfo.manager}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, manager: e.target.value })} disabled={userCreationLoading}
              placeholder="e.g., CN=John Doe,OU=Users,DC=RPL,DC=Local" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Manager Email (Optional)" variant="outlined" type="email" value={newUserInfo.managerEmail}
              onChange={(e) => setNewUserInfo({ ...newUserInfo, managerEmail: e.target.value })} disabled={userCreationLoading}
              placeholder="e.g., manager@rehrig.com"
              helperText="If no Manager DN is provided, enter the manager's email to receive credentials" />
          </Grid>
        </Grid>
      ),
      validate: () => {
        const errs: string[] = [];
        if (!newUserInfo.ou.trim()) errs.push('Organizational Unit is required');
        return errs.length ? errs : undefined;
      },
    },
    {
      label: 'Groups',
      icon: 'group_add',
      optional: true,
      content: (
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Site Location (Optional)</InputLabel>
              <Select value={newUserInfo.siteLocation}
                onChange={(e) => setNewUserInfo({ ...newUserInfo, siteLocation: e.target.value })}
                label="Site Location (Optional)" disabled={userCreationLoading}>
                <MenuItem value=""><em>Default Groups Only</em></MenuItem>
                {siteConfigs.map((site) => (
                  <MenuItem key={site.id} value={site.id}>{site.name} ({site.groups.length} additional groups)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {jobProfiles.length > 0 && (
            <Grid size={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Job Category (Optional)</InputLabel>
                <Select value={selectedJobProfile} onChange={(e) => setSelectedJobProfile(e.target.value)}
                  label="Job Category (Optional)" disabled={userCreationLoading}>
                  <MenuItem value=""><em>No Job Category</em></MenuItem>
                  {jobProfiles.map((profile, idx) => (
                    <MenuItem key={idx} value={profile.category}>{profile.category} ({profile.groups.length} groups)</MenuItem>
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
                    <Chip key={idx} label={group.split(',')[0].replace('CN=', '')} size="small" color="primary" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
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
                    <Chip key={idx} label={group.name} size="small" color="success" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}
          {(selectedSiteGroups.length > 0 || selectedJobProfileGroups.length > 0) && (
            <Grid size={12}>
              <Alert severity="warning" icon="📊">
                <Typography variant="subtitle2" gutterBottom><strong>Total Groups Summary:</strong></Typography>
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
      ),
    },
    {
      label: 'Review',
      icon: 'checklist',
      content: (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Review Account Details</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={1}>
            <Grid size={6}><Typography variant="body2" color="text.secondary">First Name</Typography></Grid>
            <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.firstName}</strong></Typography></Grid>
            <Grid size={6}><Typography variant="body2" color="text.secondary">Last Name</Typography></Grid>
            <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.lastName}</strong></Typography></Grid>
            <Grid size={6}><Typography variant="body2" color="text.secondary">Username</Typography></Grid>
            <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.username}</strong></Typography></Grid>
            <Grid size={6}><Typography variant="body2" color="text.secondary">Email</Typography></Grid>
            <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.email}</strong></Typography></Grid>
            <Grid size={6}><Typography variant="body2" color="text.secondary">OU</Typography></Grid>
            <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.ou}</strong></Typography></Grid>
            {newUserInfo.title && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Title</Typography></Grid>
              <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.title}</strong></Typography></Grid></>)}
            {newUserInfo.department && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Department</Typography></Grid>
              <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.department}</strong></Typography></Grid></>)}
            {newUserInfo.manager && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Manager DN</Typography></Grid>
              <Grid size={6}><Typography variant="body2" sx={{ wordBreak: 'break-all' }}><strong>{newUserInfo.manager}</strong></Typography></Grid></>)}
            {newUserInfo.managerEmail && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Manager Email</Typography></Grid>
              <Grid size={6}><Typography variant="body2"><strong>{newUserInfo.managerEmail}</strong></Typography></Grid></>)}
            {newUserInfo.siteLocation && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Site</Typography></Grid>
              <Grid size={6}><Typography variant="body2"><strong>{siteConfigs.find(s => s.id === newUserInfo.siteLocation)?.name}</strong></Typography></Grid></>)}
            {selectedJobProfile && (<><Grid size={6}><Typography variant="body2" color="text.secondary">Job Profile</Typography></Grid>
              <Grid size={6}><Typography variant="body2"><strong>{selectedJobProfile}</strong></Typography></Grid></>)}
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Total groups: {10 + selectedSiteGroups.length + selectedJobProfileGroups.length}
          </Typography>
        </Paper>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [newUserInfo, userCreationLoading, siteConfigs, jobProfiles, selectedJobProfile, selectedSiteGroups, selectedJobProfileGroups]);

  // Load site configurations and user role on mount
  useEffect(() => {
    Promise.all([loadSiteConfigs(), loadUserRole()])
      .finally(() => setInitialLoading(false));
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

  const operations = [
    { id: 'groups', label: 'Add to Standard Groups', icon: <MaterialSymbol icon="group" />, color: theme.palette.primary.main },
    { id: 'proxies', label: 'Configure Proxy Addresses', icon: <MaterialSymbol icon="mail" />, color: theme.palette.primary.light },
  ];

  if (initialLoading) {
    return <PageSkeleton />;
  }

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
            icon={<MaterialSymbol icon="security" size={18} />}
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
              startIcon={loading ? <CircularProgress size={20} /> : <MaterialSymbol icon="search" />}
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
            startIcon={<MaterialSymbol icon="lock_open" />}
            sx={{
              borderColor: theme.palette.secondary.main,
              color: theme.palette.secondary.main,
              '&:hover': {
                borderColor: theme.palette.secondary.dark,
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
                startIcon={<MaterialSymbol icon="person_add" />}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: theme.palette.action.hover,
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
                  setUserCreationStep(0);
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
                startIcon={<MaterialSymbol icon="badge" />}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: theme.palette.action.hover,
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
                startIcon={<MaterialSymbol icon="group" />}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: theme.palette.action.hover,
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
      <Terminal
        output={progress}
        loading={loading}
        onClear={clearTerminal}
        progressPercent={progressPercent}
        collapsible
        showLineNumbers
      />

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
                <MaterialSymbol icon="check_circle" filled color={theme.palette.success.main} sx={{ mr: 1 }} />
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
              <MaterialSymbol icon="person" size={60} sx={{ color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Enter a username to get started
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* MFA Removal Dialog */}
      <Dialog open={mfaDialogOpen} onClose={() => !mfaLoading && setMfaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'primary.dark' }}>
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
              <Terminal
                output={mfaProgress}
                loading={mfaLoading}
                title="MFA Removal Output"
                collapsible={false}
                showLineNumbers={false}
                maxHeight={300}
                minHeight={100}
              />
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
              <Terminal
                output={mfaProgress}
                loading={false}
                title="MFA Removal Output"
                collapsible={false}
                showLineNumbers={false}
                maxHeight={200}
                minHeight={80}
              />
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
                startIcon={mfaLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                disabled={mfaLoading || !mfaUsername.trim()}
                sx={{ bgcolor: 'secondary.main', color: 'primary.dark', '&:hover': { bgcolor: 'secondary.dark' } }}
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
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          Create New User Account
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!userCreationResult && !userCreationLoading && (
            <StepperForm
              steps={userCreationSteps}
              onComplete={handleUserCreation}
              onStepChange={setUserCreationStep}
              activeStep={userCreationStep}
              loading={userCreationLoading}
              completeLabel="Create User"
              draftKey="adhelper_newuser_draft"
              draftData={newUserInfo as unknown as Record<string, unknown>}
              onRestoreDraft={(data) => setNewUserInfo(data as typeof newUserInfo)}
            />
          )}
          {userCreationLoading && (
            <>
              <LinearProgress sx={{ mt: 2 }} />
              <Terminal
                output={userCreationProgress}
                loading={userCreationLoading}
                title="User Creation Output"
                collapsible={false}
                showLineNumbers={false}
                maxHeight={200}
                minHeight={80}
              />
            </>
          )}
          {userCreationResult && (
            <>
              <Alert severity={userCreationResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                {userCreationResult.success ? 'User account created successfully!' : userCreationResult.error}
              </Alert>
              {userCreationResult.success && userCreationResult.result && (
                <>
                  <Paper sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
                    <Typography variant="body2"><strong>Username:</strong> {userCreationResult.result.Username}</Typography>
                    <Typography variant="body2"><strong>Email:</strong> {userCreationResult.result.Email}</Typography>
                    <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                      <strong>Temporary Password:</strong> {userCreationResult.result.Password}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      ⚠️ User must change password at first logon.
                    </Typography>
                  </Paper>
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
          {!userCreationResult && !userCreationLoading && (
            <Button onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
          )}
          {(userCreationResult || userCreationLoading) && (
            <Button onClick={() => setUserDialogOpen(false)} variant="contained" disabled={userCreationLoading}>
              {userCreationResult ? 'Close' : 'Cancel'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Contractor Account Extension Dialog */}
      <Dialog open={contractorDialogOpen} onClose={() => !contractorLoading && setContractorDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
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
              <Terminal
                output={contractorProgress}
                loading={contractorLoading}
                title="Contractor Processing Output"
                collapsible={false}
                showLineNumbers={false}
                maxHeight={300}
                minHeight={80}
              />
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
                <Paper sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom><strong>Processing Summary</strong></Typography>
                  <Typography variant="body2">Users found &amp; processed: <strong>{contractorResult.result.Stats.UsersFound}</strong></Typography>
                  <Typography variant="body2">Users skipped: <strong>{contractorResult.result.Stats.UsersSkipped}</strong></Typography>
                  <Typography variant="body2">In correct OU: <strong>{contractorResult.result.Stats.UsersInCorrectOU}</strong></Typography>
                  <Typography variant="body2">Display names updated: <strong>{contractorResult.result.Stats.DisplayNamesUpdated}</strong></Typography>
                  <Typography variant="body2">Display names already correct: <strong>{contractorResult.result.Stats.DisplayNamesAlreadyCorrect}</strong></Typography>
                  <Typography variant="body2">Expirations extended: <strong>{contractorResult.result.Stats.ExpirationsExtended}</strong></Typography>
                  {contractorResult.result.Stats.Errors > 0 && (
                    <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                      Errors: <strong>{contractorResult.result.Stats.Errors}</strong>
                    </Typography>
                  )}
                </Paper>
              )}
              <Terminal
                output={contractorProgress}
                loading={false}
                title="Contractor Processing Output"
                collapsible={false}
                showLineNumbers={false}
                maxHeight={200}
                minHeight={80}
              />
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
                startIcon={contractorLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                disabled={contractorLoading || !contractorUsernames.trim()}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
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
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
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
          <Terminal
            output={bulkProgress}
            loading={bulkLoading}
            title="Bulk Processing Output"
            collapsible={false}
            showLineNumbers={false}
            maxHeight={300}
            minHeight={80}
          />

          {/* Results summary */}
          {bulkResult && (
            <Box>
              <Alert severity={bulkResult.success ? 'success' : bulkResult.Stats?.Errors > 0 ? 'warning' : 'error'} sx={{ mb: 2 }}>
                {bulkResult.success
                  ? 'Bulk processing completed successfully!'
                  : bulkResult.error || 'Bulk processing completed with errors.'}
              </Alert>
              {bulkResult.Stats && (
                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
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
                startIcon={bulkLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                disabled={bulkLoading || !bulkUsernames.trim()}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
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
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialSymbol icon="security" />
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

