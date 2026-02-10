import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useADConnection } from '../context/ADConnectionContext';

interface ADDisconnectedBannerProps {
  dismissible?: boolean;
}

const ADDisconnectedBanner: React.FC<ADDisconnectedBannerProps> = ({ dismissible = true }) => {
  const { status, checkConnection } = useADConnection();
  const [dismissed, setDismissed] = React.useState(false);

  const handleOpenFortiClient = () => {
    // Try to open FortiClient VPN
    // Note: This may not work in all environments
    try {
      window.open('forticlient://', '_blank');
    } catch (error) {
      console.error('Failed to open FortiClient:', error);
    }
  };

  const handleRetry = async () => {
    setDismissed(false);
    await checkConnection();
  };

  // Don't show if connected, checking, or dismissed
  if (status.connected || status.checking || (dismissed && dismissible)) {
    return null;
  }

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity="error"
        icon={<VpnKeyIcon />}
        sx={{
          mb: 2,
          borderLeft: '4px solid #f44336',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{
                color: '#f44336',
                borderColor: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  bgcolor: 'rgba(244, 67, 54, 0.04)',
                },
              }}
            >
              Retry
            </Button>
            {dismissible && (
              <IconButton
                size="small"
                onClick={() => setDismissed(true)}
                sx={{ color: '#f44336' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle sx={{ fontWeight: 'bold', mb: 1 }}>
          Not Connected to Active Directory
        </AlertTitle>
        
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {status.error || 'Unable to connect to Active Directory services.'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            To resolve this issue:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <li>
              <Typography variant="body2">
                Connect to <strong>FortiClient VPN</strong> to access the corporate network
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Verify your VPN credentials are correct
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Ensure you have network connectivity
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Check that your AD credentials are configured in Settings
              </Typography>
            </li>
          </Box>

          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<VpnKeyIcon />}
              onClick={handleOpenFortiClient}
              sx={{
                bgcolor: '#0536B6',
                '&:hover': { bgcolor: '#003063' },
              }}
            >
              Open FortiClient VPN
            </Button>
          </Box>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default ADDisconnectedBanner;

