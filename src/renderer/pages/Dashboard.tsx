import { useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { StatCard } from '../components/StatCard';
import { ActivityTimeline, ActivityItem } from '../components/ActivityTimeline';
import { QuickActions, QuickAction } from '../components/QuickActions';
import { UsageChart } from '../components/UsageChart';
import { TicketStatusChart } from '../components/TicketStatusChart';
import { StaggerContainer, StaggerItem } from '../components/PageTransition';
import { HelpTooltip } from '../components/HelpTooltip';

/** Props so the parent can wire navigation from quick actions */
export interface DashboardProps {
  onNavigate?: (pageId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {

  // ── Greeting helper ─────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  // ── Quick actions ───────────────────────────────────────────────────
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'ad',
        label: 'AD Helper',
        description: 'Manage users, groups & licenses',
        icon: 'group',
        color: 'primary',
        onClick: () => onNavigate?.('adhelper'),
      },
      {
        id: 'jira',
        label: 'Jira Updater',
        description: 'Update stale Jira tickets',
        icon: 'assignment',
        color: 'secondary',
        onClick: () => onNavigate?.('jira'),
      },
      {
        id: 'settings',
        label: 'Settings',
        description: 'Credentials & configuration',
        icon: 'settings',
        color: 'info',
        onClick: () => onNavigate?.('settings'),
      },
    ],
    [onNavigate],
  );

  // ── Placeholder activity (empty for now – will be wired to audit log later)
  const recentActivity: ActivityItem[] = [];

  return (
    <StaggerContainer>
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <StaggerItem>
        <Paper
          sx={{
            p: { xs: 3, sm: 4 },
            mb: 4,
            background: 'linear-gradient(90deg, #0536B6 0%, #3283FE 100%)',
            color: 'white',
            borderRadius: 3,
            boxShadow: '0px 8px 24px rgba(5, 54, 182, 0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                fontSize: '1.75rem',
                fontWeight: 700,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
              src="/logo.png"
              alt="Rehrig Pacific"
            >
              ADH
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                {greeting}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                {dateStr} &bull; Rehrig Pacific IT Administration Portal
              </Typography>
            </Box>
          </Box>
        </Paper>
      </StaggerItem>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <StaggerItem>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Users Processed Today"
              value={0}
              icon={<MaterialSymbol icon="group" filled size={28} />}
              color="primary"
              subtitle="Active Directory operations"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Jira Tickets Updated"
              value={0}
              icon={<MaterialSymbol icon="assignment" filled size={28} />}
              color="secondary"
              subtitle="48-hour stale ticket updates"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Success Rate"
              value="100%"
              icon={<MaterialSymbol icon="check_circle" filled size={28} />}
              color="success"
              subtitle="All operations"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Active Sessions"
              value={1}
              icon={<MaterialSymbol icon="trending_up" filled size={28} />}
              color="info"
              subtitle="Current session"
            />
          </Grid>
        </Grid>
      </StaggerItem>

      {/* ── Activity + Quick Actions row ────────────────────────────── */}
      <StaggerItem>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Activity &amp; Quick Actions
          </Typography>
          <HelpTooltip
            title="Activity Timeline"
            content="Shows recent AD operations and Jira updates. Activity is recorded automatically as you use the tools."
          />
        </Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <ActivityTimeline items={recentActivity} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <QuickActions actions={quickActions} />
          </Grid>
        </Grid>
      </StaggerItem>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <StaggerItem>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Usage Analytics
          </Typography>
          <HelpTooltip
            title="Usage Charts"
            content="Visualizes AD operations and Jira ticket processing trends over time. Data is collected from your session history."
          />
        </Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <UsageChart />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TicketStatusChart />
          </Grid>
        </Grid>
      </StaggerItem>
    </StaggerContainer>
  );
};

export default Dashboard;

