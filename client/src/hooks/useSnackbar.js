import { createContext, useContext } from 'react';

export const SnackbarContext = createContext({ success: () => {}, error: () => {} });

// const toast = useSnackbar(); toast.success('Saved'); toast.error(err.message);
export const useSnackbar = () => useContext(SnackbarContext);
