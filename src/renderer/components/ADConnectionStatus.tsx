import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useADConnection } from '../context/ADConnectionContext';

interface ADConnectionStatusProps {
  variant?: 'chip' | 'compact';
  showRefresh?: boolean;
}

const ADConnectionStatus: React.FC<ADConnectionStatusProps> = ({ 
  variant = 'chip',
  showRefresh = true 
}) => {
  const { status, checkConnection, lastCheck } = useADConnection();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error'>('success');
  const [previousConnected, setPreviousConnected] = useState<boolean | null>(null);

  // Show notification when connection status changes
  useEffect(() => {
    if (previousConnected !== null && previousConnected !== status.connected && !status.checking) {
      if (status.connected) {
        setNotificationMessage('✅ Connected to Active Directory');
        setNotificationSeverity('success');
      } else {
        setNotificationMessage('❌ Disconnected from Active Directory');
        setNotificationSeverity('error');
      }
      setShowNotification(true);
    }
    setPreviousConnected(status.connected);
  }, [status.connected, status.checking]);

  const handleRefresh = async () => {
    await checkConnection();
  };

  const getTooltipContent = () => {
    if (status.checking) {
      return 'Checking connection...';
    }
    
    if (status.connected) {
      return (
        <Box>
          <div><strong>Connected to Active Directory</strong></div>
          {status.domain && <div>Domain: {status.domain}</div>}
          {status.domainController && <div>DC: {status.domainController}</div>}
          {status.responseTime && <div>Response: {status.responseTime}ms</div>}
          {lastCheck && <div>Last check: {lastCheck.toLocaleTimeString()}</div>}
        </Box>
      );
    } else {
      return (
        <Box>
          <div><strong>Not Connected to Active Directory</strong></div>
          {status.error && <div>Error: {status.error}</div>}
          {lastCheck && <div>Last check: {lastCheck.toLocaleTimeString()}</div>}
        </Box>
      );
    }
  };

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={getTooltipContent()} arrow>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {status.checking ? (
              <CircularProgress size={16} sx={{ color: '#FFC20E' }} />
            ) : status.connected ? (
              <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
            ) : (
              <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />
            )}
          </Box>
        </Tooltip>
        {showRefresh && (
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={status.checking}
            sx={{ p: 0.5 }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
        
        <Snackbar
          open={showNotification}
          autoHideDuration={4000}
          onClose={() => setShowNotification(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setShowNotification(false)} 
            severity={notificationSeverity}
            variant="filled"
          >
            {notificationMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Default chip variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={getTooltipContent()} arrow>
        <Chip
          icon={
            status.checking ? (
              <CircularProgress size={16} sx={{ color: 'white !important' }} />
            ) : status.connected ? (
              <CheckCircleIcon />
            ) : (
              <CloudOffIcon />
            )
          }
          label={
            status.checking 
              ? 'Checking...' 
              : status.connected 
                ? 'Connected to AD' 
                : 'Not Connected'
          }
          color={status.connected ? 'success' : 'error'}
          size="small"
          sx={{
            fontWeight: 500,
            bgcolor: status.connected ? '#4caf50' : '#f44336',
            color: 'white',
            '& .MuiChip-icon': {
              color: 'white !important',
            },
          }}
        />
      </Tooltip>
      
      {showRefresh && (
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          disabled={status.checking}
          sx={{ 
            color: '#0536B6',
            '&:hover': { bgcolor: 'rgba(5, 54, 182, 0.1)' }
          }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      )}

      <Snackbar
        open={showNotification}
        autoHideDuration={4000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowNotification(false)} 
          severity={notificationSeverity}
          variant="filled"
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ADConnectionStatus;

