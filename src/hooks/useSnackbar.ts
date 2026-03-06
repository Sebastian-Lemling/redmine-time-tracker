import { useState, useCallback, useMemo } from "react";
import type { SnackbarData } from "../components/ui/Snackbar";

export interface UseSnackbarReturn {
  snackbar: SnackbarData | null;
  showSnackbar: (message: string, action?: SnackbarData["action"]) => void;
  dismissSnackbar: () => void;
}

export function useSnackbar(): UseSnackbarReturn {
  const [snackbar, setSnackbar] = useState<SnackbarData | null>(null);

  const showSnackbar = useCallback((message: string, action?: SnackbarData["action"]) => {
    setSnackbar({ message, action });
  }, []);

  const dismissSnackbar = useCallback(() => setSnackbar(null), []);

  return useMemo(
    () => ({ snackbar, showSnackbar, dismissSnackbar }),
    [snackbar, showSnackbar, dismissSnackbar],
  );
}
