import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { electronAPI } from '../electronAPI';

export interface SiteConfig {
  id: string;
  name: string;
  groups: string[];
}

interface SiteManagementProps {
  onSitesChange?: () => void;
}

const SiteManagement: React.FC<SiteManagementProps> = ({ onSitesChange }) => {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null);
  const [siteName, setSiteName] = useState('');
  const [siteGroups, setSiteGroups] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const result = await electronAPI.getSiteConfigs();
      if (result.success && result.sites) {
        setSites(result.sites);
      }
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const handleOpenDialog = (site?: SiteConfig) => {
    if (site) {
      setEditingSite(site);
      setSiteName(site.name);
      setSiteGroups(site.groups.join('\n'));
    } else {
      setEditingSite(null);
      setSiteName('');
      setSiteGroups('');
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSite(null);
    setSiteName('');
    setSiteGroups('');
    setError('');
  };

  const handleSaveSite = async () => {
    if (!siteName.trim()) {
      setError('Site name is required');
      return;
    }

    const groups = siteGroups
      .split('\n')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    if (groups.length === 0) {
      setError('At least one group DN is required');
      return;
    }

    const siteConfig: SiteConfig = {
      id: editingSite?.id || `site-${Date.now()}`,
      name: siteName.trim(),
      groups,
    };

    try {
      const result = await electronAPI.saveSiteConfig(siteConfig);
      if (result.success) {
        await loadSites();
        handleCloseDialog();
        setSuccess(`Site "${siteName}" saved successfully!`);
        setTimeout(() => setSuccess(''), 3000);
        if (onSitesChange) onSitesChange();
      } else {
        setError(result.error || 'Failed to save site');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save site');
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`Are you sure you want to delete "${siteName}"?`)) {
      return;
    }

    try {
      const result = await electronAPI.deleteSiteConfig(siteId);
      if (result.success) {
        await loadSites();
        setSuccess(`Site "${siteName}" deleted successfully!`);
        setTimeout(() => setSuccess(''), 3000);
        if (onSitesChange) onSitesChange();
      } else {
        setError(result.error || 'Failed to delete site');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete site');
    }
  };

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Configure site-specific AD groups that will be added to new users at each location.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
        >
          Add Site
        </Button>
      </Box>

      {sites.length === 0 ? (
        <Alert severity="info" icon={<LocationOnIcon />}>
          No sites configured. Click "Add Site" to create your first location.
        </Alert>
      ) : (
        <List>
          {sites.map((site) => (
            <ListItem key={site.id} sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon sx={{ color: '#0536B6' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {site.name}
                    </Typography>
                    <Chip label={`${site.groups.length} groups`} size="small" color="primary" />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {site.groups.slice(0, 2).join(', ')}
                    {site.groups.length > 2 && ` +${site.groups.length - 2} more`}
                  </Typography>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleOpenDialog(site)} sx={{ mr: 1 }}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDeleteSite(site.id, site.name)} color="error">
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Add/Edit Site Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSite ? 'Edit Site Location' : 'Add Site Location'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Site Name *"
            variant="outlined"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g., Orlando Plant, Phoenix Office, Corporate HQ"
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            label="AD Group DNs *"
            variant="outlined"
            multiline
            rows={8}
            value={siteGroups}
            onChange={(e) => setSiteGroups(e.target.value)}
            placeholder="Enter one group DN per line, e.g.:&#10;CN=Orlando_Employees,OU=Security Groups,DC=RPL,DC=Local&#10;CN=Orlando_Building_Access,OU=Security Groups,DC=RPL,DC=Local"
            helperText="Enter one Active Directory group Distinguished Name per line"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveSite}
            variant="contained"
            sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
          >
            {editingSite ? 'Update Site' : 'Add Site'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SiteManagement;

