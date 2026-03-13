import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Demo data — replace with auditLogger query results when a history API is available
const WEEKLY_DATA = [
  { day: 'Mon', adOps: 4, jiraUpdates: 2 },
  { day: 'Tue', adOps: 7, jiraUpdates: 5 },
  { day: 'Wed', adOps: 3, jiraUpdates: 1 },
  { day: 'Thu', adOps: 9, jiraUpdates: 8 },
  { day: 'Fri', adOps: 6, jiraUpdates: 4 },
  { day: 'Sat', adOps: 1, jiraUpdates: 0 },
  { day: 'Sun', adOps: 2, jiraUpdates: 1 },
];

/**
 * UsageChart — area chart showing AD operations and Jira updates per day for the past week.
 * Uses demo data; connect to the audit log API for real historical data.
 */
export const UsageChart: React.FC = () => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;

  return (
    <Paper
      sx={{ p: 3, height: '100%', minHeight: 320 }}
      aria-label="Operations this week chart"
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Operations This Week
        </Typography>
        <Typography variant="caption" color="text.secondary">
          AD operations &amp; Jira updates per day
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradAD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.28} />
              <stop offset="95%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradJira" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondary} stopOpacity={0.28} />
              <stop offset="95%" stopColor={secondary} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

          <Area
            type="monotone"
            dataKey="adOps"
            name="AD Operations"
            stroke={primary}
            fill="url(#gradAD)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="jiraUpdates"
            name="Jira Updates"
            stroke={secondary}
            fill="url(#gradJira)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default UsageChart;

