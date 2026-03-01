import React, { useState, useEffect, useCallback } from "react";
import { Box, Grid, Tooltip, Chip } from "@mui/material";
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
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

export default function Holdings() {
  const [holdings, setHoldings] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getPortfolioAnalytics();
      setAnalytics(response.data);
      // Portfolio holdings are in response.data.transactions.holdings
      setHoldings(response.data.transactions.holdings);
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

  return (
    <PageContainer title="Holdings" subtitle="Current portfolio positions">
      {/* Cash & Liquidity Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Tooltip
            title="Cash Balance: Total cash available in the portfolio, including uninvested funds from deposits, withdrawals, and trading activity."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(1) }}>
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

        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Tooltip
            title="Liquidity: Total liquid assets including cash and money market equivalents. Represents immediately available funds. Calculation: Cash Balance + Liquidity Assets."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(2) }}>
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

        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Tooltip
            title="Liquidity %: Percentage of portfolio that is liquid (cash + liquidity assets like money market funds). Higher percentage means more readily available funds. Calculation: Liquidity Balance / NAV × 100."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(3) }}>
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
      <StyledDataGrid
        rows={holdings}
        columns={columns}
        loading={loading}
        getRowId={(row) => `${row.asset_id}-${row.broker_id}`}
        pageSize={25}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </PageContainer>
  );
}
