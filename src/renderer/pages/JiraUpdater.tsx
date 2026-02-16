import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { electronAPI } from '../electronAPI';

interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  lastUpdated: string;
  assignee: string;
  updated: string;
}

const JiraUpdater: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [updateAction, setUpdateAction] = useState('comment');
  const [commentText, setCommentText] = useState(
    'This ticket has been automatically updated by ADHelper due to inactivity.'
  );
  const [transitionId, setTransitionId] = useState('');
  const [assigneeAccountId, setAssigneeAccountId] = useState('');
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  // C2 Fix: Load saved Jira credentials from Windows Credential Manager on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const result = await electronAPI.getCredential('ADHelper_Jira');
        if (result.success && result.username && result.password) {
          const [url, email] = result.username.split('|');
          setJiraUrl(url || '');
          setJiraEmail(email || '');
          setJiraToken(result.password || '');
          setCredentialsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Jira credentials:', err);
      }
    };
    loadCredentials();
  }, []);

  const getJiraConfig = () => ({ url: jiraUrl, email: jiraEmail, apiToken: jiraToken });

  const handleFindTickets = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await electronAPI.findStaleJiraTickets(getJiraConfig(), 48);
      if (!result.success) {
        setError(result.error || 'Failed to fetch Jira tickets');
        setLoading(false);
        return;
      }

      const staleTickets = result.tickets || [];
      setTickets(staleTickets);
      setLoading(false);

      if (staleTickets.length === 0) {
        setSuccess('No stale tickets found!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Jira tickets');
      setLoading(false);
    }
  };

  const getActionValue = (): string => {
    switch (updateAction) {
      case 'comment': return commentText;
      case 'status': return transitionId;
      case 'assignee': return assigneeAccountId;
      default: return '';
    }
  };

  const handleUpdateTickets = async () => {
    const value = getActionValue();
    if (!value) {
      setError(`Please provide a value for the "${updateAction}" action.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await electronAPI.bulkUpdateJiraTickets(
        getJiraConfig(),
        tickets,
        updateAction,
        value
      );

      if (!result.success) {
        setError(result.error || 'Failed to update tickets');
        setLoading(false);
        return;
      }

      const results = result.results!;
      if (results.failed > 0) {
        setError(`Updated ${results.success} tickets, but ${results.failed} failed. Errors: ${results.errors.join(', ')}`);
      } else {
        setSuccess(`Successfully updated ${results.success} tickets`);
      }

      setTickets([]);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update tickets');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Jira 48h Updater
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Automatically find and update Jira tickets that haven't been touched in 48 hours
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
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
                label="Email"
                variant="outlined"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="your-email@company.com"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="API Token"
                type="password"
                variant="outlined"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                placeholder="Your Jira API token"
                sx={{ mb: 2 }}
              />
              {credentialsLoaded && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Credentials loaded from Settings
                </Alert>
              )}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Update Action</InputLabel>
                <Select
                  value={updateAction}
                  label="Update Action"
                  onChange={(e) => setUpdateAction(e.target.value)}
                >
                  <MenuItem value="comment">Add Comment</MenuItem>
                  <MenuItem value="status">Change Status</MenuItem>
                  <MenuItem value="assignee">Update Assignee</MenuItem>
                </Select>
              </FormControl>
              {updateAction === 'comment' && (
                <TextField
                  fullWidth
                  label="Comment Text"
                  variant="outlined"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  multiline
                  rows={3}
                  sx={{ mb: 2 }}
                />
              )}
              {updateAction === 'status' && (
                <TextField
                  fullWidth
                  label="Transition ID"
                  variant="outlined"
                  value={transitionId}
                  onChange={(e) => setTransitionId(e.target.value)}
                  placeholder="e.g. 31"
                  helperText="Jira transition ID for the target status"
                  sx={{ mb: 2 }}
                />
              )}
              {updateAction === 'assignee' && (
                <TextField
                  fullWidth
                  label="Assignee Account ID"
                  variant="outlined"
                  value={assigneeAccountId}
                  onChange={(e) => setAssigneeAccountId(e.target.value)}
                  placeholder="e.g. 5b10a2844c20165700ede21g"
                  helperText="Jira account ID of the new assignee"
                  sx={{ mb: 2 }}
                />
              )}
              <Button
                fullWidth
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={handleFindTickets}
                disabled={loading || !jiraUrl || !jiraEmail || !jiraToken}
              >
                Find Stale Tickets
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {tickets.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Found {tickets.length} Stale Tickets
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleUpdateTickets}
                  disabled={loading}
                >
                  Update All
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Summary</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell>Assignee</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.key}>
                        <TableCell>{ticket.key}</TableCell>
                        <TableCell>{ticket.summary}</TableCell>
                        <TableCell>
                          <Chip label={ticket.status} size="small" />
                        </TableCell>
                        <TableCell>{ticket.lastUpdated}</TableCell>
                        <TableCell>{ticket.assignee}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {tickets.length === 0 && !loading && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Configure Jira settings and click "Find Stale Tickets" to get started
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default JiraUpdater;

