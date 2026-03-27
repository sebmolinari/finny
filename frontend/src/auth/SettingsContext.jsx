import { createContext, useState, useContext, useEffect, useCallback } from "react";
import { settingsAPI } from "../api/api";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  const fetchSettings = useCallback((signal) => {
    setSettingsLoading(true);
    setSettingsError(null);
    settingsAPI
      .get(signal)
      .then((res) => { if (!signal?.aborted) setSettings(res.data); })
      .catch((err) => { if (err.name !== "CanceledError") setSettingsError(err); })
      .finally(() => { if (!signal?.aborted) setSettingsLoading(false); });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSettings(null);
      setSettingsLoading(false);
      return;
    }
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, authLoading, fetchSettings]);

  const value = {
    settings,
    timezone: settings?.timezone ?? "UTC",
    dateFormat: settings?.date_format ?? "DD/MM/YYYY",
    settingsLoading,
    settingsError,
    refreshSettings: fetchSettings,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUserSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within SettingsProvider");
  }
  return context;
};
