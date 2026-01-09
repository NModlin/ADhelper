import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const Settings: React.FC = () => {
  const [adDomain, setAdDomain] = useState('RPL.Local');
  const [adServer, setAdServer] = useState('');
  const [m365TenantId, setM365TenantId] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save settings logic here
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure application settings and preferences
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Directory Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth
              label="AD Domain"
              variant="outlined"
              value={adDomain}
              onChange={(e) => setAdDomain(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="AD Server (Optional)"
              variant="outlined"
              value={adServer}
              onChange={(e) => setAdServer(e.target.value)}
              placeholder="dc01.domain.local"
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Configure your Active Directory domain and server settings.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Microsoft 365 Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth
              label="Tenant ID"
              variant="outlined"
              value={m365TenantId}
              onChange={(e) => setM365TenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Configure your Microsoft 365 tenant settings.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Application Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                />
              }
              label="Auto-save credentials"
            />
            <br />
            <FormControlLabel
              control={
                <Switch
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
              }
              label="Enable notifications"
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
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
              ADHelper - Modern desktop application for Active Directory and Jira management
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;

