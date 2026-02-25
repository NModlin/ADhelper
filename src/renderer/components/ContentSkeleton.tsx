import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Skeleton,
} from '@mui/material';

// ── Dashboard Skeleton ─────────────────────────────────────────────────
export const DashboardSkeleton: React.FC = () => (
  <Box>
    {/* Hero banner */}
    <Skeleton
      variant="rectangular"
      height={120}
      sx={{ borderRadius: 3, mb: 4 }}
    />

    {/* Stat cards */}
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Skeleton variant="circular" width={52} height={52} />
                <Skeleton variant="rectangular" width={50} height={22} sx={{ borderRadius: 2 }} />
              </Box>
              <Skeleton variant="text" width="50%" height={40} />
              <Skeleton variant="text" width="70%" height={20} />
              <Skeleton variant="text" width="45%" height={16} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Activity + Quick Actions row */}
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width={180} height={32} sx={{ mb: 2 }} />
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width={140} height={32} sx={{ mb: 2 }} />
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Skeleton variant="rounded" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="text" width="50%" height={16} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

// ── Form / Settings Skeleton ───────────────────────────────────────────
export const FormSkeleton: React.FC<{ sections?: number }> = ({ sections = 2 }) => (
  <Box>
    {Array.from({ length: sections }).map((_, s) => (
      <Paper key={s} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton variant="text" width={200} height={28} />
        </Box>
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2, justifyContent: 'flex-end' }}>
          <Skeleton variant="rounded" width={100} height={36} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rounded" width={100} height={36} sx={{ borderRadius: 1.5 }} />
        </Box>
      </Paper>
    ))}
  </Box>
);

// ── Page Hero + Cards Skeleton (ADHelper / JiraUpdater) ────────────────
export const PageSkeleton: React.FC = () => (
  <Box>
    {/* Page header */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Skeleton variant="text" width={280} height={36} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={400} height={20} />
    </Paper>

    {/* Action cards row */}
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[1, 2, 3].map((i) => (
        <Grid size={{ xs: 12, sm: 4 }} key={i}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width="60%" height={24} />
              </Box>
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="rounded" width={100} height={36} sx={{ mt: 2, borderRadius: 1.5 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Content area */}
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5, mb: 2 }} />
      <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
    </Paper>
  </Box>
);

