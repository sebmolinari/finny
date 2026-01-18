import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TableContainer,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AttachMoney as AttachMoneyIcon } from "@mui/icons-material";
import { MetricCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import StyledDataGrid from "../components/StyledDataGrid";
import { analyticsAPI } from "../api/api";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
} from "../utils/formatNumber";

export default function Holdings() {
  const [portfolio, setPortfolio] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [hideZeroQuantity, setHideZeroQuantity] = useState(true);

  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getPortfolioAnalytics();
      setAnalytics(response.data);
      // Portfolio holdings are in response.data.transactions.holdings
      setPortfolio(response.data.transactions.holdings);
      setLoading(false);
    } catch (error) {
      console.error("Error loading holdings and analytics:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  const filteredRows = (portfolio || []).filter((holding) => {
    if (
      hideZeroQuantity &&
      (!holding.total_quantity || holding.total_quantity === 0)
    ) {
      return false;
    }
    return true;
  });

  const rows = filteredRows.map((h) => ({ ...h }));

  const columns = [
    {
      field: "symbol",
      headerName: "Symbol",
      flex: 1,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "broker_name",
      headerName: "Broker",
      flex: 1,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "asset_type",
      headerName: "Type",
      flex: 1,
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
          <Box
            sx={{
              display: "inline-block",
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              backgroundColor: bg,
              color: fg,
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
            title={t}
          >
            {label}
          </Box>
        );
      },
    },
    {
      field: "total_quantity",
      headerName: "Quantity",
      flex: 1,
      type: "number",
      headerAlign: "right",
      align: "right",
      valueGetter: (params) => params.row.total_quantity,
      renderCell: (params) => formatNumber(params.value, 4),
    },
    {
      field: "average_cost",
      headerName: "Avg Cost",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "cost_basis",
      headerName: "Cost Basis",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "market_price",
      headerName: "Current Price",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "market_value",
      headerName: "Market Value",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => formatCurrency(params.value, 0),
    },
    {
      field: "daily_pnl",
      headerName: "Daily P&L",
      flex: 1,
      headerAlign: "right",
      align: "right",
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
      flex: 1,
      headerAlign: "right",
      align: "right",
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Portfolio Holdings
      </Typography>

      {/* Cash & Liquidity Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Tooltip
            title="Cash Balance: Total cash available in the portfolio, including uninvested funds from deposits, withdrawals, and trading activity."
            arrow
          >
            <Box>
              <MetricCard
                label="Cash Balance"
                value={formatCurrency(
                  analytics?.transactions?.cash_balance || 0,
                  0,
                )}
                valueColor="primary"
                icon={<AttachMoneyIcon color="warning" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={4}>
          <Tooltip
            title="Liquidity: Total liquid assets including cash and money market equivalents. Represents immediately available funds. Calculation: Cash Balance + Liquidity Assets."
            arrow
          >
            <Box>
              <MetricCard
                label="Liquidity"
                value={formatCurrency(
                  analytics?.transactions?.liquidity_balance || 0,
                  0,
                )}
                valueColor="primary"
                icon={<AttachMoneyIcon color="warning" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={4}>
          <Tooltip
            title="Liquidity %: Percentage of portfolio that is liquid (cash + liquidity assets like money market funds). Higher percentage means more readily available funds. Calculation: Liquidity Balance / NAV × 100."
            arrow
          >
            <Box>
              <MetricCard
                label="Liquidity %"
                value={formatPercent(
                  analytics?.transactions?.liquidity_percent || 0,
                )}
                valueColor="primary"
                icon={<AttachMoneyIcon color="warning" />}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Holdings Table */}
      <Paper sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Current Holdings</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={hideZeroQuantity}
                  onChange={(e) => setHideZeroQuantity(e.target.checked)}
                  color="primary"
                />
              }
              label="Hide Zero Quantity"
            />
          </Box>
        </Box>
        <TableContainer>
          <StyledDataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => `${row.asset_id}-${row.broker_id}`}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            autoHeight
          />
        </TableContainer>
      </Paper>
    </Container>
  );
}
