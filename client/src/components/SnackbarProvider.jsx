import { useCallback, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { SnackbarContext } from '../hooks/useSnackbar';

// One app-wide toast for success and error messages after actions.
function SnackbarProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), []);
  const value = useMemo(() => ({
    success: (message) => show(message, 'success'),
    error: (message) => show(message, 'error'),
  }), [show]);

  const close = (_, reason) => {
    if (reason !== 'clickaway') setToast(null);
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={toast?.severity === 'error' ? 6000 : 3500}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={close} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export default SnackbarProvider;
