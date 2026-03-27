import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
  Alert,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  AttachMoney as AttachMoneyIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { MetricCard } from "../components/data-display/StyledCard";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { analyticsAPI } from "../api/api";
import { getTodayInTimezone } from "../utils/dateUtils";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
} from "../utils/formatNumber";
import PageContainer from "../components/layout/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import { useUserSettings } from "../hooks/useUserSettings";

export default function Holdings() {
  const [holdings, setHoldings] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Historical mode
  const [isHistorical, setIsHistorical] = useState(false);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  const theme = useTheme();
  const { timezone } = useUserSettings();
  const [asOfDate, setAsOfDate] = useState(() => getTodayInTimezone("UTC"));

  // Sync asOfDate when timezone loads
  useEffect(() => {
    setAsOfDate(getTodayInTimezone(timezone));
  }, [timezone]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getPortfolioAnalytics();
      setAnalytics(response.data);
      setHoldings(response.data.transactions.holdings);
      setLoading(false);
    } catch (error) {
      console.error("Error loading holdings and analytics:", error);
      setError("Failed to load data. Please try again.");
      setLoading(false);
    }
  }, []);

  const loadHistoricalData = useCallback(async (date) => {
    if (!date) return;
    try {
      setHistoricalLoading(true);
      const response = await analyticsAPI.getHistoricalHoldings(date);
      setHistoricalData(response.data);
    } catch (error) {
      console.error("Error loading historical holdings:", error);
      setHistoricalData(null);
    } finally {
      setHistoricalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isHistorical && asOfDate) {
      loadHistoricalData(asOfDate);
    }
  }, [isHistorical, asOfDate, loadHistoricalData]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert
          severity="error"
          action={<Button onClick={loadData}>Retry</Button>}
        >
          {error}
        </Alert>
      </PageContainer>
    );
  }

  // Determine which data to show
  const activeHoldings = isHistorical
    ? (historicalData?.holdings ?? [])
    : (holdings ?? []);

  const historicalControls = (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={isHistorical}
            onChange={(e) => setIsHistorical(e.target.checked)}
            size="small"
          />
        }
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <HistoryIcon fontSize="small" />
            <Typography variant="body2">Historical View</Typography>
          </Box>
        }
        sx={{ mr: 0 }}
      />
      {isHistorical && (
        <TextField
          label="As of Date"
          type="date"
          size="small"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
      )}
    </Box>
  );
  const columns = [
    {
      field: "symbol",
      headerName: "Symbol",
      headerAlign: "center",
      width: 80,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      width: 120,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 80,
      renderCell: (params) => {
        const t = params.value || "";
        const colorMap = {
          currency: ["#e3f2fd", "#1976d2"],
          equity: ["#f3e5f5", "#9c27b0"],
          crypto: ["#fff3e0", "#ff9800"],
          fixedincome: ["#e0f2f1", "#00796b"],
          realestate: ["#fce4ec", "#c2185b"],
        };
        const [bg, fg] = colorMap[t] || ["#f5f5f5", "#757575"];
        const label =
          t === "equity"
            ? "EQT"
            : t === "crypto"
              ? "CRY"
              : t === "currency"
                ? "CCY"
                : t === "fixedincome"
                  ? "FI"
                  : t === "realestate"
                    ? "RE"
                    : t.toUpperCase();
        return (
          <Chip
            label={label}
            size="small"
            sx={{
              backgroundColor: bg,
              color: fg,
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        );
      },
    },
    {
      field: "total_quantity",
      headerName: "Quantity",
      headerAlign: "center",
      align: "right",
      flex: 1,
      type: "number",
      renderCell: (params) => formatNumber(params.value, 4),
    },
    {
      field: "average_cost",
      headerName: "Avg Cost",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "cost_basis",
      headerName: "Cost Basis",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "market_price",
      headerName: "Current Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "market_value",
      headerName: "Market Value",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(params.value, 0),
    },
    {
      field: "daily_pnl",
      headerName: "Daily P&L",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => {
        const val = params.value || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return <span style={{ color }}>{formatCurrency(val, 0)}</span>;
      },
    },
    {
      field: "unrealized_gain",
      headerName: "Unrealized P&L",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => {
        const val = params.value || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        const percent = formatPercent(params.row.unrealized_gain_percent);
        return (
          <span style={{ color }}>
            {formatCurrency(val, 0)} {percent ? `(${percent})` : ""}
          </span>
        );
      },
    },
  ];

  // Hide daily_pnl in historical mode (not available for past dates)
  const visibleColumns = isHistorical
    ? columns.filter((c) => c.field !== "daily_pnl")
    : columns;

  return (
    <PageContainer actions={historicalControls}>
      {/* Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {isHistorical ? (
          // Historical summary metrics
          <>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ ...fadeInUpSx(1) }}>
                <MetricCard
                  title="Market Value (as of)"
                  value={formatCurrency(
                    historicalData?.summary?.total_market_value || 0,
                    0,
                  )}
                  valueColor={theme.palette.primary.main}
                  valueFontWeight={400}
                  icon={<AttachMoneyIcon color="warning" />}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ ...fadeInUpSx(2) }}>
                <MetricCard
                  title="Cost Basis (as of)"
                  value={formatCurrency(
                    historicalData?.summary?.total_cost_basis || 0,
                    0,
                  )}
                  valueColor={theme.palette.primary.main}
                  valueFontWeight={400}
                  icon={<AttachMoneyIcon color="warning" />}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ ...fadeInUpSx(3) }}>
                <MetricCard
                  title="Unrealized P&L (as of)"
                  value={`${formatCurrency(
                    historicalData?.summary?.total_unrealized_gain || 0,
                    0,
                  )} (${formatPercent(
                    historicalData?.summary?.total_unrealized_gain_percent || 0,
                  )})`}
                  valueColor={
                    (historicalData?.summary?.total_unrealized_gain || 0) >= 0
                      ? theme.palette.success.main
                      : theme.palette.error.main
                  }
                  valueFontWeight={400}
                  icon={<AttachMoneyIcon color="warning" />}
                />
              </Box>
            </Grid>
          </>
        ) : (
          // Live metrics
          <>
            <Grid size={{ xs: 12, md: 4 }}>
              <Tooltip
                title="Cash Balance: Total cash available in the portfolio, including uninvested funds from deposits, withdrawals, and trading activity."
                arrow
              >
                <Box sx={{ ...fadeInUpSx(4) }}>
                  <MetricCard
                    title="Cash Balance"
                    value={formatCurrency(
                      analytics?.transactions?.cash_balance || 0,
                      0,
                    )}
                    valueColor={theme.palette.primary.main}
                    valueFontWeight={400}
                    icon={<AttachMoneyIcon color="warning" />}
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Tooltip
                title="Liquidity: Total liquid assets including cash and money market equivalents. Represents immediately available funds. Calculation: Cash Balance + Liquidity Assets."
                arrow
              >
                <Box sx={{ ...fadeInUpSx(5) }}>
                  <MetricCard
                    title="Liquidity"
                    value={formatCurrency(
                      analytics?.transactions?.liquidity_balance || 0,
                      0,
                    )}
                    valueColor={theme.palette.primary.main}
                    valueFontWeight={400}
                    icon={<AttachMoneyIcon color="warning" />}
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Tooltip
                title="Liquidity %: Percentage of portfolio that is liquid (cash + liquidity assets like money market funds). Higher percentage means more readily available funds. Calculation: Liquidity Balance / NAV × 100."
                arrow
              >
                <Box sx={{ ...fadeInUpSx(6) }}>
                  <MetricCard
                    title="Liquidity %"
                    value={formatPercent(
                      analytics?.transactions?.liquidity_percent || 0,
                    )}
                    valueColor={theme.palette.primary.main}
                    valueFontWeight={400}
                    icon={<AttachMoneyIcon color="warning" />}
                  />
                </Box>
              </Tooltip>
            </Grid>
          </>
        )}
      </Grid>
      {/* Holdings Table */}
      <Box sx={{ ...fadeInUpSx(7) }}>
        <StyledDataGrid
          rows={activeHoldings}
          columns={visibleColumns}
          loading={isHistorical ? historicalLoading : loading}
          getRowId={(row) => `${row.asset_id}-${row.broker_id}`}
          pageSize={25}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Box>
    </PageContainer>
  );
}
