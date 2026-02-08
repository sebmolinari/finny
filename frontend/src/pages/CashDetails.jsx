import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import { MetricCard, StatCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { settingsAPI } from "../api/api";
import { analyticsAPI } from "../api/api";
import { useTheme } from "@mui/material/styles";
import { formatCurrency, formatNumber } from "../utils/formatNumber";
import { formatDate } from "../utils/dateUtils";
import StyledDataGrid from "../components/StyledDataGrid";

export default function CashDetails() {
  const theme = useTheme();
  const [details, setDetails] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [userSettingsLoading, setUserSettingsLoading] = useState(true);

  // Load cash details
  const loadDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await analyticsAPI.getCashBalanceDetails();
      setDetails(res.data);
    } catch (error) {
      // Optionally handle error
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // Load user settings
  const loadUserSettings = useCallback(async () => {
    setUserSettingsLoading(true);
    try {
      const res = await settingsAPI.get();
      setUserSettings(res.data);
    } catch (error) {
      setUserSettings(null);
    } finally {
      setUserSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetails();
    loadUserSettings();
  }, [loadDetails, loadUserSettings]);

  if (detailsLoading || userSettingsLoading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  const columns = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      width: 100,
      renderCell: (params) =>
        formatDate(params.row.date, userSettings.date_format),
    },
    {
      field: "type",
      headerName: "Type",
      headerAlign: "center",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getTypeColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "symbol",
      headerName: "Asset",
      headerAlign: "center",
      width: 100,
      renderCell: (params) =>
        params.row.symbol ? (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.symbol}
            </Typography>
          </Box>
        ) : (
          "—"
        ),
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      width: 150,
    },
    {
      field: "quantity",
      headerName: "Quantity",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value ? formatNumber(params.value, 4) : "—",
    },
    {
      field: "price",
      headerName: "Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value ? formatCurrency(params.value) : "—",
    },
    {
      field: "amount",
      headerName: "Amount",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(params.row.amount),
    },
    {
      field: "cash_effect",
      headerName: "Cash Effect",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span
          style={{
            color:
              params.row.cash_effect >= 0
                ? theme.palette.success.main
                : theme.palette.error.main,
          }}
        >
          {params.row.cash_effect >= 0 ? "+" : ""}
          {formatCurrency(params.row.cash_effect)}
        </span>
      ),
    },
    {
      field: "running_balance",
      headerName: "Running Balance",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span
          style={{
            color:
              params.row.running_balance >= 0
                ? theme.palette.success.main
                : theme.palette.error.main,
          }}
        >
          {formatCurrency(params.row.running_balance)}
        </span>
      ),
    },
  ];

  const { summary, cash_flows, transaction_count } = details;

  const getTypeColor = (type) => {
    switch (type) {
      case "Deposit":
        return "success";
      case "Withdrawal":
        return "error";
      case "Buy":
        return "warning";
      case "Sell":
        return "info";
      case "Dividend":
        return "primary";
      case "Interest":
        return "secondary";
      case "Coupon":
        return "secondary";
      case "Rental":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Cash Balance Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This page shows a detailed breakdown of your cash balance, including all
        transactions that affect cash: deposits add cash, withdrawals remove
        cash, buys consume cash, sells generate cash, and dividends add cash.
        The running balance shows your cash position after each transaction.
      </Typography>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <StatCard
            label="Current Cash Balance"
            value={formatCurrency(summary.current_balance)}
            valueColor={theme.palette.primary.main}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <StatCard label="Total Transactions" value={transaction_count} />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <MetricCard
            label="Net Inflow"
            value={formatCurrency(summary.net_inflow)}
            subtitle="Deposits - Withdrawals"
            valueColor={
              summary.net_inflow >= 0
                ? theme.palette.success.main
                : theme.palette.error.main
            }
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <MetricCard
            label="Net Trading"
            value={formatCurrency(summary.net_trading)}
            subtitle="Sells - Buys"
            valueColor={
              summary.net_trading >= 0
                ? theme.palette.success.main
                : theme.palette.error.main
            }
          />
        </Grid>
      </Grid>
      {/* Breakdown by Category */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cash Flow Breakdown
        </Typography>
        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Box sx={{ p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Inflows
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Deposits:</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.success.main }}
                >
                  +{formatCurrency(summary.total_deposits)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Sales:</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.info.main }}
                >
                  +{formatCurrency(summary.total_sell)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Dividends:</Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.secondary.main}
                >
                  +{formatCurrency(summary.total_dividends)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Interest:</Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.secondary.main}
                >
                  +{formatCurrency(summary.total_interest || 0)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Coupons:</Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.secondary.main}
                >
                  +{formatCurrency(summary.total_coupons || 0)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Rentals:</Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.secondary.main}
                >
                  +{formatCurrency(summary.total_rentals || 0)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Total Inflows:</Typography>
                <Typography
                  variant="subtitle2"
                  color={theme.palette.success.main}
                >
                  +
                  {formatCurrency(
                    summary.total_deposits +
                      summary.total_sell +
                      summary.total_dividends +
                      summary.total_interest +
                      summary.total_coupons +
                      summary.total_rentals,
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Box sx={{ p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Outflows
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Withdrawals:</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.error.main }}
                >
                  -{formatCurrency(summary.total_withdrawals)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Purchases:</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.error.main }}
                >
                  -{formatCurrency(summary.total_buy)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Total Outflows:</Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: theme.palette.error.main }}
                >
                  -
                  {formatCurrency(
                    summary.total_withdrawals + summary.total_buy,
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Box sx={{ p: 2, backgroundColor: "#e3f2fd", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Net Cash Position
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Total Inflows:</Typography>
                <Typography variant="body2">
                  +
                  {formatCurrency(
                    summary.total_deposits +
                      summary.total_sell +
                      summary.total_dividends +
                      summary.total_interest +
                      summary.total_coupons +
                      summary.total_rentals,
                  )}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Total Outflows:</Typography>
                <Typography variant="body2">
                  -
                  {formatCurrency(
                    summary.total_withdrawals + summary.total_buy,
                  )}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Cash Balance:
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color={theme.palette.primary.main}
                >
                  {formatCurrency(summary.current_balance)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      {/* Transaction History */}
      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Transaction History (Chronological)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All transactions affecting cash balance, showing the running balance
          after each transaction. Positive cash effects add to your balance,
          negative effects reduce it.
        </Typography>

        <Paper>
          <StyledDataGrid
            rows={cash_flows}
            columns={columns}
            loading={detailsLoading}
            getRowId={(row) => row.id}
            pageSize={100}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Paper>
      </Paper>
    </Container>
  );
}
