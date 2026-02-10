import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WorkIcon from '@mui/icons-material/Work';
import { electronAPI } from '../electronAPI';

interface JobProfile {
  category: string;
  groups: Array<{
    name: string;
    distinguishedName: string;
  }>;
}

interface JobProfileManagementProps {
  siteId: string;
  siteName: string;
}

const JobProfileManagement: React.FC<JobProfileManagementProps> = ({ siteId, siteName }) => {
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<JobProfile | null>(null);
  const [category, setCategory] = useState('');
  const [groupsText, setGroupsText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadJobProfiles();
  }, [siteId]);

  const loadJobProfiles = async () => {
    const result = await electronAPI.getJobProfiles(siteId);
    if (result.success && result.jobProfiles) {
      setJobProfiles(result.jobProfiles);
    }
  };

  const handleOpenDialog = (profile?: JobProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setCategory(profile.category);
      // Convert groups to text format
      const groupsStr = profile.groups
        .map(g => `${g.name}|${g.distinguishedName}`)
        .join('\n');
      setGroupsText(groupsStr);
    } else {
      setEditingProfile(null);
      setCategory('');
      setGroupsText('');
    }
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProfile(null);
    setCategory('');
    setGroupsText('');
    setError('');
  };

  const handleSaveProfile = async () => {
    if (!category.trim()) {
      setError('Category name is required');
      return;
    }

    if (!groupsText.trim()) {
      setError('At least one group is required');
      return;
    }

    // Parse groups from text
    const lines = groupsText.split('\n').filter(line => line.trim());
    const groups = lines.map(line => {
      const parts = line.split('|');
      if (parts.length !== 2) {
        throw new Error('Invalid group format. Use: GroupName|DistinguishedName');
      }
      return {
        name: parts[0].trim(),
        distinguishedName: parts[1].trim(),
      };
    });

    const newProfile: JobProfile = {
      category: category.trim(),
      groups,
    };

    let updatedProfiles: JobProfile[];
    if (editingProfile) {
      // Update existing profile
      updatedProfiles = jobProfiles.map(p =>
        p.category === editingProfile.category ? newProfile : p
      );
    } else {
      // Add new profile
      updatedProfiles = [...jobProfiles, newProfile];
    }

    const result = await electronAPI.saveJobProfiles(siteId, updatedProfiles);
    if (result.success) {
      setJobProfiles(updatedProfiles);
      setSuccess(result.message || 'Job profile saved successfully');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to save job profile');
    }
  };

  const handleDeleteProfile = async (profile: JobProfile) => {
    if (!confirm(`Delete job profile "${profile.category}"?`)) {
      return;
    }

    const updatedProfiles = jobProfiles.filter(p => p.category !== profile.category);
    const result = await electronAPI.saveJobProfiles(siteId, updatedProfiles);
    if (result.success) {
      setJobProfiles(updatedProfiles);
      setSuccess('Job profile deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to delete job profile');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon /> Job Profiles for {siteName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(90deg, #0536B6 0%, #3283FE 100%)',
            '&:hover': { background: 'linear-gradient(90deg, #003063 0%, #0536B6 100%)' },
          }}
        >
          Add Job Profile
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List>
        {jobProfiles.length === 0 ? (
          <Alert severity="info">No job profiles configured for this site.</Alert>
        ) : (
          jobProfiles.map((profile, index) => (
            <React.Fragment key={index}>
              <ListItem
                secondaryAction={
                  <Box>
                    <IconButton edge="end" onClick={() => handleOpenDialog(profile)} sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteProfile(profile)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={profile.category}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {profile.groups.length} group(s)
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < jobProfiles.length - 1 && <Divider />}
            </React.Fragment>
          ))
        )}
      </List>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProfile ? 'Edit Job Profile' : 'Add Job Profile'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Job Category Name"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., ORL Standard User (Production)"
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Groups (one per line, format: GroupName|DistinguishedName)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              value={groupsText}
              onChange={(e) => setGroupsText(e.target.value)}
              placeholder="All_Employees|CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local"
              helperText="Enter each group on a new line in the format: GroupName|DistinguishedName"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            sx={{
              background: 'linear-gradient(90deg, #0536B6 0%, #3283FE 100%)',
              '&:hover': { background: 'linear-gradient(90deg, #003063 0%, #0536B6 100%)' },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobProfileManagement;

