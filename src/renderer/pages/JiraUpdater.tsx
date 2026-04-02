import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tab,
  Tabs,
  Badge,
} from '@mui/material';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { DataTable, DataColumn } from '../components/DataTable';

import { EmptyState } from '../components/EmptyState';
import { HelpTooltip } from '../components/HelpTooltip';
import { electronAPI } from '../electronAPI';
import { useNotification } from '../hooks/useNotification';
import type { SiteConfig } from '../components/SiteManagement';

interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  lastUpdated: string;
  assignee: string;
  updated: string;
}

const JiraUpdater: React.FC = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [activeTab, setActiveTab] = useState(0);

  // ── Stale-tickets state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [updateAction, setUpdateAction] = useState('comment');
  const [commentText, setCommentText] = useState(
    'This ticket has been automatically updated by ADHelper due to inactivity.'
  );
  const [transitionId, setTransitionId] = useState('');
  const [assigneeAccountId, setAssigneeAccountId] = useState('');

  // ── Site-tickets state ────────────────────────────────────────────────────
  const [siteTickets, setSiteTickets] = useState<JiraTicket[]>([]);
  const [siteTicketsLoading, setSiteTicketsLoading] = useState(false);
  const [responsibleSites, setResponsibleSites] = useState<SiteConfig[]>([]);
  const [lastSiteRefresh, setLastSiteRefresh] = useState<Date | null>(null);
  /** Count pushed from the background poller — drives the tab badge when the tab is not active */
  const [polledCount, setPolledCount] = useState<number | null>(null);

  // ── Site-tickets logic ────────────────────────────────────────────────────
  const loadSiteTickets = useCallback(async () => {
    setSiteTicketsLoading(true);
    try {
      // Load responsible site IDs and all site configs in parallel
      const [respResult, sitesResult] = await Promise.all([
        electronAPI.getResponsibleSites(),
        electronAPI.getSiteConfigs(),
      ]);

      const siteIds = respResult.success ? (respResult.siteIds ?? []) : [];
      const allSites = sitesResult.success ? (sitesResult.sites ?? []) : [];

      // Filter to sites the user is responsible for that have a Jira project key
      const mySites = allSites.filter(
        (s) => siteIds.includes(s.id) && s.jiraProjectKey,
      );
      setResponsibleSites(mySites);

      if (mySites.length === 0) {
        setSiteTickets([]);
        setSiteTicketsLoading(false);
        return;
      }

      const projectKeys = mySites.map((s) => s.jiraProjectKey!);
      const result = await electronAPI.findSiteJiraTickets(projectKeys);

      if (result.success) {
        setSiteTickets(result.tickets ?? []);
        setLastSiteRefresh(new Date());
      } else {
        showError(result.error || 'Failed to fetch site tickets');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch site tickets');
    } finally {
      setSiteTicketsLoading(false);
    }
  }, [showError]);

  // Load site tickets when the Site Tickets tab becomes active
  useEffect(() => {
    if (activeTab === 1) {
      loadSiteTickets();
    }
  }, [activeTab, loadSiteTickets]);

  // Subscribe to the push event from the main-process poller.
  // - When the Site Tickets tab is open: re-fetch so the table stays fresh.
  // - When the tab is closed: just update the badge count so the user sees an indicator.
  useEffect(() => {
    electronAPI.onSiteTicketCount((count: number) => {
      if (activeTab === 1) {
        loadSiteTickets();
      } else {
        setPolledCount(count);
      }
    });
    return () => {
      electronAPI.removeSiteTicketCountListener();
    };
  }, [activeTab, loadSiteTickets]);

  // ── Column definitions for the DataTable ──────────────────────────
  const ticketColumns = useMemo<DataColumn<JiraTicket>[]>(
    () => [
      { id: 'key', label: 'Key', width: 120, sortable: true },
      { id: 'summary', label: 'Summary', sortable: true },
      {
        id: 'status',
        label: 'Status',
        width: 140,
        sortable: true,
        format: (v) => <Chip label={String(v)} size="small" />,
      },
      { id: 'lastUpdated', label: 'Last Updated', width: 140, sortable: true },
      { id: 'assignee', label: 'Assignee', width: 140, sortable: true },
    ],
    [],
  );

  const handleFindTickets = async () => {
    setLoading(true);

    try {
      const result = await electronAPI.findStaleJiraTickets(48);
      if (!result.success) {
        showError(result.error || 'Failed to fetch Jira tickets');
        setLoading(false);
        return;
      }

      const staleTickets = result.tickets || [];
      setTickets(staleTickets);
      setLoading(false);

      if (staleTickets.length === 0) {
        showSuccess('No stale tickets found!');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch Jira tickets');
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
      showWarning(`Please provide a value for the "${updateAction}" action.`);
      return;
    }

    setLoading(true);

    try {
      const result = await electronAPI.bulkUpdateJiraTickets(
        tickets,
        updateAction,
        value
      );

      if (!result.success) {
        showError(result.error || 'Failed to update tickets');
        setLoading(false);
        return;
      }

      const results = result.results!;
      if (results.failed > 0) {
        showWarning(`Updated ${results.success} tickets, but ${results.failed} failed. Errors: ${results.errors.join(', ')}`);
      } else {
        showSuccess(`Successfully updated ${results.success} tickets`);
      }

      setTickets([]);
      setLoading(false);
    } catch (err: any) {
      showError(err.message || 'Failed to update tickets');
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" gutterBottom>
          Jira Updater
        </Typography>
        <HelpTooltip
          title="Jira Updater"
          content="Stale Tickets: find and bulk-update tickets not touched in 48 hours. Site Tickets: view all open tickets from the Jira projects mapped to your responsible sites."
        />
      </Box>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage Jira tickets — bulk-update stale tickets or monitor your site&#39;s open tickets.
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Stale Tickets (48 h)" />
          <Tab
            label={
              <Badge
                badgeContent={siteTickets.length || polledCount || null}
                color="primary"
              >
                Site Tickets
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Stale Tickets ── */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuration
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Jira credentials are managed in <strong>Settings</strong>. The API token is
                  retrieved securely from Windows Credential Manager and never enters the UI.
                </Alert>
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
                  startIcon={loading ? <CircularProgress size={20} /> : <MaterialSymbol icon="refresh" />}
                  onClick={handleFindTickets}
                  disabled={loading}
                >
                  Find Stale Tickets
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {tickets.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Found {tickets.length} Stale Tickets
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MaterialSymbol icon="play_arrow" />}
                    onClick={handleUpdateTickets}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update All'}
                  </Button>
                </Box>
                <DataTable<JiraTicket>
                  columns={ticketColumns}
                  data={tickets}
                  getRowId={(t) => t.key}
                  searchable
                  defaultRowsPerPage={10}
                  emptyMessage="No stale tickets found"
                />
              </Paper>
            )}
            {tickets.length === 0 && !loading && (
              <Paper sx={{ p: 3 }}>
                <EmptyState
                  icon="assignment"
                  title="No Stale Tickets Found"
                  description='Configure your Jira credentials and click "Find Stale Tickets" to scan for tickets that haven&#39;t been updated in 48 hours.'
                />
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: Site Tickets ── */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {responsibleSites.length > 0
                ? `Monitoring: ${responsibleSites.map((s) => `${s.name} (${s.jiraProjectKey})`).join(', ')}`
                : 'No responsible sites configured with a Jira project key.'}
            </Typography>
            {lastSiteRefresh && (
              <Chip
                label={`Refreshed ${lastSiteRefresh.toLocaleTimeString()}`}
                size="small"
                variant="outlined"
              />
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={siteTicketsLoading ? <CircularProgress size={16} /> : <MaterialSymbol icon="refresh" />}
              onClick={loadSiteTickets}
              disabled={siteTicketsLoading}
            >
              {siteTicketsLoading ? 'Loading…' : 'Refresh'}
            </Button>
          </Box>

          {responsibleSites.length === 0 && !siteTicketsLoading && (
            <Paper sx={{ p: 3 }}>
              <Alert severity="info">
                You have no responsible sites with a Jira Project Key configured. Go to{' '}
                <strong>Settings → My Responsible Sites</strong> to select the sites you manage, and make sure each
                site has a <strong>Jira Project Key</strong> set in{' '}
                <strong>Site Location Management</strong>.
              </Alert>
            </Paper>
          )}

          {responsibleSites.length > 0 && (
            <Paper sx={{ p: 3 }}>
              {siteTicketsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : siteTickets.length === 0 ? (
                <EmptyState
                  icon="check_circle"
                  title="All Clear!"
                  description="No open tickets found for your responsible sites."
                />
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    {siteTickets.length} open ticket{siteTickets.length !== 1 ? 's' : ''} across your sites
                  </Typography>
                  <DataTable<JiraTicket>
                    columns={ticketColumns}
                    data={siteTickets}
                    getRowId={(t) => t.key}
                    searchable
                    defaultRowsPerPage={25}
                    emptyMessage="No open site tickets"
                  />
                </>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default JiraUpdater;

