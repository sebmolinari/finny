import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import { Preview as PreviewIcon } from "@mui/icons-material";
import { analyticsAPI, assetAPI, brokerAPI, settingsAPI } from "../api/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate } from "../utils/dateUtils";
import { handleApiError } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatNumber";
import StyledDataGrid from "../components/StyledDataGrid";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ── year-end holdings columns ──────────────────────────────────────────────
const holdingsColumns = [
  { field: "asset", headerName: "Symbol", headerAlign: "center", width: 80 },
  {
    field: "asset_name",
    headerName: "Name",
    headerAlign: "center",
    width: 150,
  },
  {
    field: "asset_type",
    headerName: "Type",
    headerAlign: "center",
    width: 100,
  },
  { field: "broker", headerName: "Broker", headerAlign: "center", width: 100 },
  {
    field: "quantity",
    headerName: "Quantity",
    headerAlign: "center",
    align: "right",
    flex: 1,
    renderCell: (p) => Number(p.row.quantity).toFixed(4),
  },
  {
    field: "price",
    headerName: "Price (USD)",
    headerAlign: "center",
    align: "right",
    flex: 1,
    renderCell: (p) => formatCurrency(p.row.price),
  },
  {
    field: "market_value",
    headerName: "Market Value (USD)",
    headerAlign: "center",
    align: "right",
    minWidth: 150,
    flex: 1,
    renderCell: (p) => formatCurrency(p.row.market_value),
  },
  {
    field: "usdars_bna",
    headerName: "FX Rate",
    headerAlign: "center",
    align: "right",
    flex: 1,
    renderCell: (p) => Number(p.row.usdars_bna).toFixed(2),
  },
  {
    field: "price_in_ccy",
    headerName: "Price (CCY)",
    headerAlign: "center",
    align: "right",
    flex: 1,
    renderCell: (p) => formatCurrency(p.row.price_in_ccy),
  },
  {
    field: "market_value_in_ccy",
    headerName: "Market Value (CCY)",
    headerAlign: "center",
    align: "right",
    minWidth: 150,
    flex: 1,
    renderCell: (p) => formatCurrency(p.row.market_value_in_ccy),
  },
];

export default function TaxReport() {
  const [tabValue, setTabValue] = useState(0);

  // ── year-end holdings state ──────────────────────────────────────────────
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [excludeAssetTypes, setExcludeAssetTypes] = useState([]);
  const [excludeBrokers, setExcludeBrokers] = useState([]);
  const [userDateFormat, setUserDateFormat] = useState(null);
  const [userSettingsLoading, setUserSettingsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState(null);

  // ── realized gains state ─────────────────────────────────────────────────
  const [gainsYear, setGainsYear] = useState(new Date().getFullYear());
  const [gainsData, setGainsData] = useState(null);
  const [loadingGains, setLoadingGains] = useState(false);
  const [gainsError, setGainsError] = useState(null);

  // ── tax harvesting state ─────────────────────────────────────────────────
  const [harvestYear, setHarvestYear] = useState(new Date().getFullYear() - 1);
  const [harvestData, setHarvestData] = useState(null);
  const [loadingHarvest, setLoadingHarvest] = useState(false);
  const [harvestError, setHarvestError] = useState(null);

  const loadUserSettings = useCallback(async () => {
    setUserSettingsLoading(true);
    try {
      const res = await settingsAPI.get();
      setUserDateFormat(res.data.date_format);
      setUserSettings(res.data);
    } catch (error) {
      setUserDateFormat(null);
    } finally {
      setUserSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConstants();
    loadBrokers();
    loadUserSettings();
  }, [loadUserSettings]);

  const loadConstants = async () => {
    try {
      const response = await assetAPI.getAll();
      const uniqueTypes = [...new Set(response.data.map((a) => a.asset_type))];
      setAssetTypes(uniqueTypes);
    } catch (error) {
      console.error("Error loading asset types:", error);
    }
  };

  const loadBrokers = async () => {
    try {
      const response = await brokerAPI.getAll();
      setBrokers(response.data);
    } catch (error) {
      console.error("Error loading brokers:", error);
    }
  };

  const handlePreview = async () => {
    if (!year) {
      setError("Please enter a year");
      return;
    }
    setLoadingReport(true);
    setError(null);
    setReportData(null);
    try {
      const response = await analyticsAPI.getTaxReport(
        year,
        excludeAssetTypes,
        excludeBrokers,
      );
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tax report");
      handleApiError(err, "Failed to load tax report");
    } finally {
      setLoadingReport(false);
    }
  };

  const loadRealizedGains = async () => {
    setLoadingGains(true);
    setGainsError(null);
    try {
      const ltDays = userSettings?.lt_holding_period_days ?? 365;
      const res = await analyticsAPI.getRealizedGains(gainsYear, ltDays);
      setGainsData(res.data);
    } catch (err) {
      setGainsError(
        err.response?.data?.message || "Failed to load realized gains",
      );
    } finally {
      setLoadingGains(false);
    }
  };

  const loadHarvesting = async () => {
    setLoadingHarvest(true);
    setHarvestError(null);
    try {
      const rate = userSettings?.marginal_tax_rate ?? null;
      const res = await analyticsAPI.getTaxHarvesting(rate, harvestYear);
      setHarvestData(res.data);
    } catch (err) {
      setHarvestError(
        err.response?.data?.message || "Failed to load tax harvesting",
      );
    } finally {
      setLoadingHarvest(false);
    }
  };

  const handleTabChange = (_e, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && !gainsData && !loadingGains) loadRealizedGains();
  };

  if (userSettingsLoading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  // ── realized gains columns ─────────────────────────────────────────────
  const gainsColumns = [
    { field: "symbol", headerName: "Symbol", headerAlign: "center", width: 80 },
    { field: "name", headerName: "Name", headerAlign: "center", width: 140 },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 90,
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      width: 110,
    },
    {
      field: "acquisition_date",
      headerName: "Acquired",
      headerAlign: "center",
      width: 110,
      renderCell: (p) => formatDate(p.value, userDateFormat),
    },
    {
      field: "disposal_date",
      headerName: "Disposed",
      headerAlign: "center",
      width: 110,
      renderCell: (p) => formatDate(p.value, userDateFormat),
    },
    {
      field: "quantity",
      headerName: "Qty",
      headerAlign: "center",
      align: "right",
      width: 90,
      renderCell: (p) => Number(p.value).toFixed(4),
    },
    {
      field: "cost_basis",
      headerName: "Cost Basis",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.value),
    },
    {
      field: "sale_proceeds",
      headerName: "Proceeds",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.value),
    },
    {
      field: "gain_loss",
      headerName: "Gain / Loss",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => {
        const val = p.value;
        const color = val >= 0 ? "success.main" : "error.main";
        return (
          <Typography variant="body2" color={color} fontWeight={600}>
            {formatCurrency(val)}
          </Typography>
        );
      },
    },
    {
      field: "holding_days",
      headerName: "Days",
      headerAlign: "center",
      align: "right",
      width: 70,
    },
    {
      field: "is_long_term",
      headerName: "Term",
      headerAlign: "center",
      width: 75,
      renderCell: (p) => (
        <Chip
          label={p.value ? "LT" : "ST"}
          size="small"
          color={p.value ? "success" : "warning"}
          variant="outlined"
        />
      ),
    },
    {
      field: "is_wash_sale",
      headerName: "Wash",
      headerAlign: "center",
      width: 70,
      renderCell: (p) =>
        p.value ? (
          <Chip
            label="⚠"
            size="small"
            color="error"
            title="Potential wash sale"
          />
        ) : null,
    },
  ];

  // ── tax harvesting columns ───────────────────────────────────────────────
  const harvestColumns = [
    { field: "symbol", headerName: "Symbol", headerAlign: "center", width: 80 },
    { field: "name", headerName: "Name", headerAlign: "center", width: 140 },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 90,
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      width: 110,
    },
    {
      field: "quantity",
      headerName: "Qty",
      headerAlign: "center",
      align: "right",
      width: 90,
      renderCell: (p) => Number(p.value).toFixed(4),
    },
    {
      field: "cost_basis",
      headerName: "Cost Basis",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.value),
    },
    {
      field: "market_value",
      headerName: "Market Value",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.value),
    },
    {
      field: "unrealized_gain_loss",
      headerName: "Unrealized Loss",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Typography variant="body2" color="error.main" fontWeight={600}>
          {formatCurrency(p.value)}
        </Typography>
      ),
    },
    {
      field: "marginal_rate",
      headerName: "Tax Rate",
      headerAlign: "center",
      align: "right",
      width: 90,
      renderCell: (p) => `${(p.value * 100).toFixed(0)}%`,
    },
    {
      field: "potential_tax_saving",
      headerName: "Est. Tax Saving",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Chip
          label={formatCurrency(p.value)}
          size="small"
          color="success"
          variant="outlined"
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <Paper sx={{ p: 2, ...fadeInUpSx(1) }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Year-End Holdings" />
          <Tab label="Realized Gains" />
          <Tab label="Tax Harvesting" />
        </Tabs>

        {/* ── Tab 0: Year-End Holdings ── */}
        {tabValue === 0 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Holdings snapshot at year-end with local-currency FX conversion.
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                mb: 3,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <TextField
                type="number"
                label="Year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                size="small"
                sx={{ width: 120 }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Exclude Asset Types</InputLabel>
                <Select
                  multiple
                  value={excludeAssetTypes}
                  onChange={(e) => setExcludeAssetTypes(e.target.value)}
                  input={
                    <OutlinedInput size="small" label="Exclude Asset Types" />
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((v) => (
                        <Chip key={v} label={v} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {assetTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Exclude Brokers</InputLabel>
                <Select
                  multiple
                  value={excludeBrokers}
                  onChange={(e) => setExcludeBrokers(e.target.value)}
                  input={<OutlinedInput size="small" label="Exclude Brokers" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((v) => (
                        <Chip key={v} label={v} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {brokers.map((broker) => (
                    <MenuItem key={broker.id} value={broker.name}>
                      {broker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={!year || loadingReport}
              >
                Preview Report
              </Button>
            </Box>

            {loadingReport && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {reportData && !loadingReport && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Report for Year {reportData.year}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Year-End Date:{" "}
                    {formatDate(reportData.year_end_date, userDateFormat)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    FX Rate Asset: {reportData.fx_rate_asset} ={" "}
                    {reportData.fx_rate.toFixed(2)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Total Market Value (USD):{" "}
                    {formatCurrency(reportData.total_market_value)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Market Value (Local CCY):{" "}
                    {formatCurrency(reportData.total_market_value_in_ccy)}
                  </Typography>
                </Box>
                <StyledDataGrid
                  label="Holdings"
                  rows={reportData.holdings.map((h, i) => ({
                    ...h,
                    id: h.id ?? `${h.asset}-${h.broker || "nobroker"}-${i}`,
                  }))}
                  columns={holdingsColumns}
                  loading={loadingReport}
                  getRowId={(row) => row.id}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 3,
                    mt: 1,
                  }}
                >
                  <Typography variant="subtitle2">
                    Total Market Value (USD):
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {formatCurrency(reportData.total_market_value)}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ ml: 3 }}>
                    Total Market Value (Local CCY):
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {formatCurrency(reportData.total_market_value_in_ccy)}
                  </Typography>
                </Box>
                {reportData.holdings.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No holdings found for the specified year.
                  </Alert>
                )}
              </>
            )}
          </Box>
        )}

        {/* ── Tab 1: Realized Gains ── */}
        {tabValue === 1 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Closed positions with FIFO cost basis, holding period, and ST/LT
              classification. Long-term threshold:{" "}
              {userSettings?.lt_holding_period_days ?? 365} days (configurable
              in Settings).
            </Typography>
            <Box
              sx={{ display: "flex", gap: 1.5, mb: 2, alignItems: "center" }}
            >
              <TextField
                type="number"
                label="Year"
                value={gainsYear}
                onChange={(e) => setGainsYear(parseInt(e.target.value, 10))}
                size="small"
                sx={{ width: 120 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<PreviewIcon />}
                onClick={loadRealizedGains}
                disabled={loadingGains}
              >
                Preview Report
              </Button>
            </Box>
            {loadingGains && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {gainsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {gainsError}
              </Alert>
            )}
            {gainsData && !loadingGains && (
              <>
                <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
                  {[
                    {
                      label: "Total Gain/Loss",
                      value: gainsData.summary.total_gain_loss,
                    },
                    {
                      label: "Short-Term",
                      value: gainsData.summary.short_term_gain_loss,
                    },
                    {
                      label: "Long-Term",
                      value: gainsData.summary.long_term_gain_loss,
                    },
                  ].map(({ label, value }) => (
                    <Box key={label}>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography
                        variant="h6"
                        color={value >= 0 ? "success.main" : "error.main"}
                        fontWeight={700}
                      >
                        {formatCurrency(value)}
                      </Typography>
                    </Box>
                  ))}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Wash Sales Flagged
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {gainsData.summary.wash_sale_count}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Positions
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {gainsData.summary.position_count}
                    </Typography>
                  </Box>
                </Box>
                <StyledDataGrid
                  label="Realized Gains"
                  rows={gainsData.positions.map((p, i) => ({ ...p, id: i }))}
                  columns={gainsColumns}
                  getRowId={(row) => row.id}
                />
                {/* ── Wash Sales section ── */}
                {(() => {
                  const washRows = gainsData.positions.filter(
                    (p) => p.is_wash_sale,
                  );
                  return (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        Wash Sales
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Sell-at-loss transactions where the same asset was
                        repurchased within 30 days. Consult a tax professional —
                        rules vary by jurisdiction.
                      </Typography>
                      {washRows.length === 0 ? (
                        <Alert severity="success">
                          No potential wash sales detected.
                        </Alert>
                      ) : (
                        <>
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            {washRows.length} potential wash sale
                            {washRows.length > 1 ? "s" : ""} detected.
                          </Alert>
                          <StyledDataGrid
                            label="Wash Sales"
                            rows={washRows.map((p, i) => ({
                              ...p,
                              id: `ws-${i}`,
                            }))}
                            columns={gainsColumns}
                            getRowId={(row) => row.id}
                          />
                        </>
                      )}
                    </Box>
                  );
                })()}
              </>
            )}
          </Box>
        )}

        {/* ── Tab 2: Tax Harvesting ── */}
        {tabValue === 2 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Open positions with unrealized losses at year-end that could be
              harvested to offset gains. Marginal rate:{" "}
              {((userSettings?.marginal_tax_rate ?? 0.25) * 100).toFixed(0)}%
              (configurable in Settings).
            </Typography>
            <Box
              sx={{ display: "flex", gap: 1.5, mb: 2, alignItems: "center" }}
            >
              <TextField
                type="number"
                label="Year"
                value={harvestYear}
                onChange={(e) => {
                  setHarvestYear(parseInt(e.target.value, 10));
                  setHarvestData(null);
                }}
                size="small"
                sx={{ width: 120 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<PreviewIcon />}
                onClick={loadHarvesting}
                disabled={loadingHarvest}
              >
                Preview Report
              </Button>
            </Box>
            {loadingHarvest && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {harvestError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {harvestError}
              </Alert>
            )}
            {harvestData &&
              !loadingHarvest &&
              (harvestData.length === 0 ? (
                <Alert severity="info">
                  No positions with unrealized losses found — great job!
                </Alert>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total estimated tax saving:{" "}
                      <strong>
                        {formatCurrency(
                          harvestData.reduce(
                            (s, r) => s + r.potential_tax_saving,
                            0,
                          ),
                        )}
                      </strong>
                    </Typography>
                  </Box>
                  <StyledDataGrid
                    label="Tax Harvesting"
                    rows={harvestData.map((r, i) => ({
                      ...r,
                      id: `${r.asset_id}-${r.broker_name}-${i}`,
                    }))}
                    columns={harvestColumns}
                    getRowId={(row) => row.id}
                  />
                </>
              ))}
          </Box>
        )}
      </Paper>
    </PageContainer>
  );
}
