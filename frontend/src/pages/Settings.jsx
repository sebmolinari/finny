import { useState, useEffect } from "react";
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
  Alert,
} from "@mui/material";
import {
  Save as SaveIcon,
  Email as EmailIcon,
  AccountBalance as AccountBalanceIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { settingsAPI, assetAPI } from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageContainer from "../components/layout/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import { useUserSettings } from "../hooks/useUserSettings";

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings: contextSettings,
    settingsLoading,
    settingsError,
    refreshSettings,
  } = useUserSettings();
  const [settings, setSettings] = useState({
    date_format: "DD/MM/YYYY",
    timezone: "America/Argentina/Buenos_Aires",
    liquidity_asset_id: null,
    fx_rate_asset_id: null,
    rebalancing_tolerance: 5,
    email_notifications_enabled: false,
    validate_cash_balance: true,
    validate_sell_balance: true,
    marginal_tax_rate: 25,
    lt_holding_period_days: 365,
  });
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    loadAssets();
    settingsAPI.markReviewed().catch(() => {});
  }, []);

  // Populate form from context once settings are available
  useEffect(() => {
    if (!contextSettings) return;
    setSettings({
      ...contextSettings,
      marginal_tax_rate: (contextSettings.marginal_tax_rate ?? 0.25) * 100,
      risk_free_rate: (contextSettings.risk_free_rate ?? 0.05) * 100,
    });
  }, [contextSettings]);

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

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await settingsAPI.update({
        ...settings,
        marginal_tax_rate: settings.marginal_tax_rate / 100,
        risk_free_rate: settings.risk_free_rate / 100,
      });
      toast.success("Settings saved successfully");
      refreshSettings();
      navigate("/");
    } catch (error) {
      handleApiError(error, "Failed to save settings");
    }
  };

  if (settingsLoading || loadingAssets) {
    return <LoadingSpinner />;
  }

  if (settingsError) {
    return (
      <PageContainer maxWidth="md">
        <Alert severity="error">
          Failed to load settings. Please refresh the page.
        </Alert>
      </PageContainer>
    );
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

            <Grid size={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <AccountBalanceIcon
                    sx={{ fontSize: 16, verticalAlign: "middle", mr: 1 }}
                  />
                  Tax Settings
                </Typography>
              </Divider>
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
                label="Marginal Tax Rate (%)"
                name="marginal_tax_rate"
                value={settings.marginal_tax_rate}
                onChange={handleChange}
                slotProps={{ min: 0, max: 100, step: 1 }}
                helperText="Your marginal income tax rate used for tax-loss harvesting estimates (default: 25%)"
              />
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
                label="Long-Term Holding Period (days)"
                name="lt_holding_period_days"
                value={settings.lt_holding_period_days}
                onChange={handleChange}
                slotProps={{ min: 1, step: 1 }}
                helperText="Minimum days held to qualify as long-term capital gain (default: 365)"
              />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <BarChartIcon
                    sx={{ fontSize: 16, verticalAlign: "middle", mr: 1 }}
                  />
                  Risk & Performance
                </Typography>
              </Divider>
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
                label="Risk-Free Rate (%)"
                name="risk_free_rate"
                value={settings.risk_free_rate}
                onChange={handleChange}
                slotProps={{ min: 0, max: 100, step: 0.1 }}
                helperText="Annual risk-free rate used for Sharpe and Sortino ratio calculations (default: 5%)"
              />
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
