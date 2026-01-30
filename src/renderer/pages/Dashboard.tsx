import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const Dashboard: React.FC = () => {
  const stats = [
    { title: 'Users Processed Today', value: '0', icon: <PeopleIcon fontSize="large" />, color: '#1976d2' },
    { title: 'Jira Tickets Updated', value: '0', icon: <AssignmentIcon fontSize="large" />, color: '#dc004e' },
    { title: 'Success Rate', value: '100%', icon: <CheckCircleIcon fontSize="large" />, color: '#4caf50' },
    { title: 'Active Sessions', value: '1', icon: <TrendingUpIcon fontSize="large" />, color: '#ff9800' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to ADHelper
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage Active Directory users and Jira tickets from one modern interface.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                background: `linear-gradient(135deg, ${stat.color}22 0%, ${stat.color}11 100%)`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: stat.color, mr: 2 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                {stat.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AD Helper
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage Active Directory users, assign groups, configure licenses, and set up proxy addresses.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">
                Open AD Helper
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Jira 48h Updater
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automatically update Jira tickets that haven't been touched in 48 hours.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">
                Open Jira Updater
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No recent activity to display.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;

