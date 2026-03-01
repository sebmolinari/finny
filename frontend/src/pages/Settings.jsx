import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import { Save as SaveIcon, Email as EmailIcon } from "@mui/icons-material";
import { settingsAPI, assetAPI } from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

export default function Settings() {
  const [settings, setSettings] = useState({
    date_format: "YYYY-MM-DD",
    theme: "light",
    timezone: "America/Argentina/Buenos_Aires",
    language: "en",
    liquidity_asset_id: null,
    fx_rate_asset_id: null,
    rebalancing_tolerance: 5,
    email_notifications_enabled: false,
    email_frequency: "daily",
    validate_cash_balance: true,
    validate_sell_balance: true,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    loadSettings();
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await assetAPI.getAll();
      // Filter to only show currency assets
      const currencyAssets = response.data.filter(
        (asset) => asset.asset_type === "currency",
      );
      setAssets(currencyAssets);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get();
      setSettings(response.data);
    } catch (error) {
      handleApiError(error, "Failed to load settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await settingsAPI.update(settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      handleApiError(error, "Failed to save settings");
    }
  };

  if (loadingSettings || loadingAssets) {
    return <LoadingSpinner maxWidth="md" />;
  }

  return (
    <PageContainer
      title="Settings"
      subtitle="Configure your personal preferences"
      maxWidth="md"
    >
      <Paper sx={{ p: 3, ...fadeInUpSx(1) }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                select
                label="Date Format"
                name="date_format"
                value={settings.date_format}
                onChange={handleChange}
              >
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-14)</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (12/14/2024)</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (14/12/2024)</MenuItem>
              </TextField>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                select
                label="Theme"
                name="theme"
                value={settings.theme}
                onChange={handleChange}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </TextField>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                select
                label="Timezone"
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
              >
                <MenuItem value="UTC">UTC</MenuItem>
                <MenuItem value="America/Argentina/Buenos_Aires">
                  Argentina/Buenos Aires
                </MenuItem>
              </TextField>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                select
                label="Language"
                name="language"
                value={settings.language}
                onChange={handleChange}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Español</MenuItem>
              </TextField>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <FormControl fullWidth required>
                <InputLabel>Liquidity Asset</InputLabel>
                <Select
                  name="liquidity_asset_id"
                  value={settings.liquidity_asset_id || ""}
                  onChange={handleChange}
                  label="Liquidity Asset"
                  required
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.symbol} - {asset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>FX Rate Asset</InputLabel>
                <Select
                  name="fx_rate_asset_id"
                  value={settings.fx_rate_asset_id || ""}
                  onChange={handleChange}
                  label="FX Rate Asset"
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.symbol} - {asset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="Rebalancing Tolerance (%)"
                name="rebalancing_tolerance"
                value={settings.rebalancing_tolerance}
                onChange={handleChange}
                slotProps={{ min: 0, max: 100, step: 1 }}
                helperText="Portfolio rebalancing tolerance in percentage points (default: 5%)"
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      settings.validate_cash_balance === 1 ||
                      settings.validate_cash_balance === true
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        validate_cash_balance: e.target.checked ? 1 : 0,
                      })
                    }
                    name="validate_cash_balance"
                  />
                }
                label="Validate Cash Balance on Buy"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                When enabled, prevents buy transactions if insufficient cash is
                available
              </Typography>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      settings.validate_sell_balance === 1 ||
                      settings.validate_sell_balance === true
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        validate_sell_balance: e.target.checked ? 1 : 0,
                      })
                    }
                    name="validate_sell_balance"
                  />
                }
                label="Validate Asset Balance on Sell"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                When enabled, prevents sell transactions if insufficient asset
                quantity is available
              </Typography>
            </Grid>

            <Grid size={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <EmailIcon
                    sx={{ fontSize: 16, verticalAlign: "middle", mr: 1 }}
                  />
                  Email Notifications
                </Typography>
              </Divider>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      settings.email_notifications_enabled === 1 ||
                      settings.email_notifications_enabled === true
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email_notifications_enabled: e.target.checked ? 1 : 0,
                      })
                    }
                    name="email_notifications_enabled"
                  />
                }
                label="Enable Portfolio Summary Emails"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Receive automated emails with your portfolio summary, holdings,
                and market data
              </Typography>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <TextField
                fullWidth
                select
                label="Email Frequency"
                name="email_frequency"
                value={settings.email_frequency}
                onChange={handleChange}
                disabled={!settings.email_notifications_enabled}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
            </Grid>

            <Grid size={12}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  size="large"
                >
                  Save Settings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </PageContainer>
  );
}
