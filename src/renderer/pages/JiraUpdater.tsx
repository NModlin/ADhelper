import React, { useState } from 'react';
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
import jiraService, { JiraTicket } from '../services/jiraService';

const JiraUpdater: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [updateAction, setUpdateAction] = useState('comment');

  const handleFindTickets = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Configure Jira service
      jiraService.configure({
        url: jiraUrl,
        email: jiraEmail,
        apiToken: jiraToken,
      });

      // Find stale tickets (48 hours)
      const staleTickets = await jiraService.findStaleTickets(48);
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

  const handleUpdateTickets = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const defaultComment = 'This ticket has been automatically updated by ADHelper due to inactivity.';

      const results = await jiraService.bulkUpdateTickets(
        tickets,
        updateAction as 'comment' | 'status' | 'assignee',
        updateAction === 'comment' ? defaultComment : ''
      );

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

