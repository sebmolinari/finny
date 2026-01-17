import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
} from "@mui/material";
import { AttachMoney as AttachMoneyIcon } from "@mui/icons-material";
import { MetricCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  StyledTable,
  StyledHeaderCell,
  TruncatedCell,
} from "../components/StyledTable";
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
                icon={<AttachMoneyIcon color="info" />}
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
                icon={<AttachMoneyIcon color="info" />}
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
        <TableContainer>
          <StyledTable>
            <TableHead>
              <TableRow>
                <StyledHeaderCell sx={{ width: 100 }}>Symbol</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 120 }}>Broker</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 60 }}>Type</StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Quantity
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Avg Cost
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 120 }}>
                  Cost Basis
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 120 }}>
                  Current Price
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 120 }}>
                  Market Value
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 120 }}>
                  Daily P&L
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 140 }}>
                  Unrealized P&L
                </StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {portfolio?.map((holding) => (
                <TableRow key={`${holding.asset_id}-${holding.broker_id}`}>
                  <TruncatedCell maxWidth={100} title={holding.symbol}>
                    {holding.symbol}
                  </TruncatedCell>
                  <TruncatedCell maxWidth={120} title={holding.broker_name}>
                    {holding.broker_name}
                  </TruncatedCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        backgroundColor:
                          holding.asset_type === "currency"
                            ? "#e3f2fd"
                            : holding.asset_type === "equity"
                              ? "#f3e5f5"
                              : holding.asset_type === "crypto"
                                ? "#fff3e0"
                                : holding.asset_type === "fixedincome"
                                  ? "#e0f2f1"
                                  : holding.asset_type === "realestate"
                                    ? "#fce4ec"
                                    : "#f5f5f5",
                        color:
                          holding.asset_type === "currency"
                            ? "#1976d2"
                            : holding.asset_type === "equity"
                              ? "#9c27b0"
                              : holding.asset_type === "crypto"
                                ? "#ff9800"
                                : holding.asset_type === "fixedincome"
                                  ? "#00796b"
                                  : holding.asset_type === "realestate"
                                    ? "#c2185b"
                                    : "#757575",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {holding.asset_type === "equity"
                        ? "EQT"
                        : holding.asset_type === "crypto"
                          ? "CRY"
                          : holding.asset_type === "currency"
                            ? "CCY"
                            : holding.asset_type === "fixedincome"
                              ? "FI"
                              : holding.asset_type === "realestate"
                                ? "RE"
                                : holding.asset_type.toUpperCase()}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(holding.total_quantity, 4)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.average_cost)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.cost_basis)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.market_price)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(holding.market_value, 0)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        holding.daily_pnl >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {formatCurrency(holding.daily_pnl || 0, 0)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        holding.unrealized_gain >= 0
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    {formatCurrency(holding.unrealized_gain, 0)} (
                    {formatPercent(holding.unrealized_gain_percent)})
                  </TableCell>
                  {/* Realized P&L column removed per request */}
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </TableContainer>
      </Paper>
    </Container>
  );
}
