import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
} from "@mui/material";
import { MetricCard, StatCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { settingsAPI } from "../api/api";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatNumber } from "../utils/formatNumber";
import { formatDate } from "../utils/dateUtils";
import {
  StyledTable,
  StyledHeaderCell,
  TruncatedCell,
} from "../components/StyledTable";

function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  const header = Object.keys(data[0]);
  const csvRows = [
    header.join(","),
    ...data.map((row) =>
      header.map((field) => JSON.stringify(row[field] ?? "")).join(",")
    ),
  ];
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CashDetails() {
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
        <Grid item xs={12} md={3}>
          <StatCard
            label="Current Cash Balance"
            value={formatCurrency(summary.current_balance)}
            valueColor="primary"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Transactions" value={transaction_count} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            label="Net Inflow"
            value={formatCurrency(summary.net_inflow)}
            subtitle="Deposits - Withdrawals"
            valueColor={summary.net_inflow >= 0 ? "success.main" : "error.main"}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            label="Net Trading"
            value={formatCurrency(summary.net_trading)}
            subtitle="Sells - Buys"
            valueColor={
              summary.net_trading >= 0 ? "success.main" : "error.main"
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
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Inflows
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Deposits:</Typography>
                <Typography variant="body2" color="success.main">
                  +{formatCurrency(summary.total_deposits)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Sales:</Typography>
                <Typography variant="body2" color="info.main">
                  +{formatCurrency(summary.total_sell)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Dividends:</Typography>
                <Typography variant="body2" color="primary.main">
                  +{formatCurrency(summary.total_dividends)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Interest:</Typography>
                <Typography variant="body2" color="secondary.main">
                  +{formatCurrency(summary.total_interest || 0)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Coupons:</Typography>
                <Typography variant="body2" color="secondary.main">
                  +{formatCurrency(summary.total_coupons || 0)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Rentals:</Typography>
                <Typography variant="body2" color="secondary.main">
                  +{formatCurrency(summary.total_rentals || 0)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Total Inflows:</Typography>
                <Typography variant="subtitle2" color="success.main">
                  +
                  {formatCurrency(
                    summary.total_deposits +
                      summary.total_sell +
                      summary.total_dividends +
                      summary.total_interest +
                      summary.total_coupons +
                      summary.total_rentals
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Outflows
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Withdrawals:</Typography>
                <Typography variant="body2" color="error.main">
                  -{formatCurrency(summary.total_withdrawals)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Purchases:</Typography>
                <Typography variant="body2" color="warning.main">
                  -{formatCurrency(summary.total_buy)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Total Outflows:</Typography>
                <Typography variant="subtitle2" color="error.main">
                  -
                  {formatCurrency(
                    summary.total_withdrawals + summary.total_buy
                  )}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
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
                      summary.total_rentals
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
                    summary.total_withdrawals + summary.total_buy
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
                  color="primary.main"
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
          <Button
            variant="outlined"
            size="small"
            onClick={() => exportToCSV(cash_flows, "transaction_history.csv")}
            sx={{ mb: 1 }}
          >
            Export
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All transactions affecting cash balance, showing the running balance
          after each transaction. Positive cash effects add to your balance,
          negative effects reduce it.
        </Typography>

        <TableContainer sx={{ maxHeight: 600 }}>
          <StyledTable stickyHeader>
            <TableHead>
              <TableRow>
                <StyledHeaderCell sx={{ width: 100 }}>Date</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 100 }}>Type</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 100 }}>Asset</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 120 }}>Broker</StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Quantity
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Price
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Amount
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 110 }}>
                  Cash Effect
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 130 }}>
                  Running Balance
                </StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cash_flows.map((flow) => (
                <TableRow key={flow.id} hover>
                  <TableCell>
                    {formatDate(flow.date, userSettings?.date_format)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={flow.type}
                      color={getTypeColor(flow.type)}
                      size="small"
                    />
                  </TableCell>
                  <TruncatedCell
                    maxWidth={100}
                    title={
                      flow.symbol ? `${flow.symbol} - ${flow.asset_name}` : "—"
                    }
                  >
                    {flow.symbol ? (
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {flow.symbol}
                        </Typography>
                        {/* <Typography variant="caption" color="text.secondary">
                          {flow.asset_name}
                        </Typography> */}
                      </Box>
                    ) : (
                      "—"
                    )}
                  </TruncatedCell>
                  <TruncatedCell maxWidth={120} title={flow.broker_name || "—"}>
                    {flow.broker_name || "—"}
                  </TruncatedCell>
                  <TableCell align="right">
                    {flow.quantity ? formatNumber(flow.quantity, 4) : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {flow.price ? formatCurrency(flow.price) : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(flow.amount)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        flow.cash_effect >= 0 ? "success.main" : "error.main",
                      fontWeight: "medium",
                    }}
                  >
                    {flow.cash_effect >= 0 ? "+" : ""}
                    {formatCurrency(flow.cash_effect)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "medium" }}>
                    {formatCurrency(flow.running_balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </TableContainer>
      </Paper>
    </Container>
  );
}
