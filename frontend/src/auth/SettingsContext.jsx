import { createContext, useState, useContext, useEffect, useCallback } from "react";
import { settingsAPI } from "../api/api";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  const fetchSettings = useCallback(() => {
    setSettingsLoading(true);
    setSettingsError(null);
    settingsAPI
      .get()
      .then((res) => setSettings(res.data))
      .catch((err) => setSettingsError(err))
      .finally(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSettings(null);
      setSettingsLoading(false);
      return;
    }
    fetchSettings();
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
