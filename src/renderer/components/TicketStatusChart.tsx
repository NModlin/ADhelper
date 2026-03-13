import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Demo data — replace with real results from the last bulkUpdateJiraTickets call
const STATUS_DATA = [
  { name: 'Updated', value: 12 },
  { name: 'Pending', value: 5 },
  { name: 'Skipped', value: 3 },
  { name: 'Failed', value: 1 },
];

/**
 * TicketStatusChart — donut chart showing distribution of Jira ticket update outcomes.
 * Uses demo data; wire to the last bulkUpdateJiraTickets result for live values.
 */
export const TicketStatusChart: React.FC = () => {
  const theme = useTheme();

  const COLORS = [
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  const total = STATUS_DATA.reduce((sum, d) => sum + d.value, 0);

  return (
    <Paper
      sx={{ p: 3, height: '100%', minHeight: 320 }}
      aria-label="Jira ticket status chart"
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Jira Ticket Status
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last batch update — {total} tickets total
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={STATUS_DATA}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) =>
              percent != null ? `${name} ${(percent * 100).toFixed(0)}%` : name
            }
            labelLine={false}
          >
            {STATUS_DATA.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="none"
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: 'inherit',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(value) => {
              const v = value as number;
              return [`${v} ticket${v !== 1 ? 's' : ''}`];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default TicketStatusChart;

