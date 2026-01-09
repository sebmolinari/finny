import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Tooltip,
} from "@mui/material";
import { MetricCard } from "../components/StyledCard";
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  ShowChart as ShowChartIcon,
  Percent as PercentIcon,
} from "@mui/icons-material";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [brokerSummary, setBrokerSummary] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadBrokerData();
    loadPerformanceData();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getPortfolioAnalytics();
      setDashboard(response.data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrokerData = async () => {
    try {
      const response = await analyticsAPI.getBrokerOverview();
      // Transform broker summary data for chart
      if (response.data && Array.isArray(response.data)) {
        const chartData = response.data
          .map((broker) => ({
            name: broker.name,
            value: broker.current_value || 0,
          }))
          .sort((a, b) => b.value - a.value);
        setBrokerSummary(chartData);
      }
    } catch (error) {
      console.error("Error loading broker data:", error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance();
      const allData = response.data;
      const perfData = allData.map((item) => ({
        date: item.date,
        value: item.total_value,
      }));
      setPerformanceData(perfData);
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio Dashboard
      </Typography>

      {/* Row 1: Portfolio Value Metrics */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <Tooltip
            title="Net Asset Value (NAV): Total market value of portfolio holdings plus available cash. The comprehensive value of all portfolio assets. Calculation: Holdings Market Value + Cash Balance."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="NAV"
                value={formatCurrency(dashboard?.nav || 0, 0)}
                icon={<AccountBalanceIcon color="primary" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="Holdings Market Value: Current fair market value of all investment positions based on latest market prices. Excludes cash. Calculation: Sum of (quantity × market price) for all holdings."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="Holdings Market Value"
                value={formatCurrency(
                  dashboard?.transactions?.holdings_market_value || 0,
                  0
                )}
                subtitle={
                  dashboard?.transactions?.daily_pnl !== undefined ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          dashboard.transactions.daily_pnl >= 0
                            ? "success.main"
                            : "error.main",
                        display: "block",
                      }}
                    >
                      Daily P&L:{" "}
                      {formatCurrency(dashboard.transactions.daily_pnl, 0)} (
                      {dashboard.transactions.daily_pnl >= 0 ? "+" : ""}
                      {formatPercent(
                        dashboard.transactions.holdings_market_value > 0
                          ? (dashboard.transactions.daily_pnl /
                              (dashboard.transactions.holdings_market_value -
                                dashboard.transactions.daily_pnl)) *
                              100
                          : 0,
                        2
                      )}
                      )
                    </Typography>
                  ) : undefined
                }
                icon={<TrendingUpIcon color="success" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="Unrealized P&L: Profit or loss on open positions that have not yet been closed. Calculation: Holdings Market Value - Cost Basis."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="Unrealized P&L"
                value={formatCurrency(
                  dashboard?.transactions?.unrealized_gain || 0,
                  0
                )}
                valueColor={
                  (dashboard?.transactions?.unrealized_gain || 0) >= 0
                    ? "success.main"
                    : "error.main"
                }
                icon={<ShowChartIcon color="primary" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="Return on Investment (ROI): Percentage return on invested capital in current holdings. Calculation: Unrealized P&L / Cost Basis × 100."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="ROI %"
                value={formatPercent(
                  dashboard?.transactions?.unrealized_gain_percent || 0
                )}
                valueColor={
                  (dashboard?.transactions?.unrealized_gain_percent || 0) >= 0
                    ? "success.main"
                    : "error.main"
                }
                icon={<PercentIcon color="success" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Row 2: Performance & Funding Metrics */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <Tooltip
            title="Net Contributions: The total cash flow into your account, calculated as all deposits minus withdrawals. Includes both invested and uninvested cash. Calculation: Deposits - Withdrawals."
            arrow
          >
            <Box>
              <MetricCard
                label="Net Contributions"
                value={formatCurrency(
                  dashboard?.transactions?.net_contributions || 0,
                  0
                )}
                icon={<AttachMoneyIcon color="secondary" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="Net Invested: Net capital currently allocated to holdings after accounting for purchases and sales. Calculation: Buy transactions - Sell transactions."
            arrow
          >
            <Box>
              <MetricCard
                label="Net Invested"
                value={formatCurrency(
                  dashboard?.transactions?.net_invested || 0,
                  0
                )}
                icon={<AttachMoneyIcon color="success" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="MWRR (IRR): Money-Weighted Rate of Return, also known as Internal Rate of Return. Reflects the annualized return considering the timing and size of cash flows in/out. Calculation: IRR of all portfolio cash flows."
            arrow
          >
            <Box>
              <MetricCard
                label="MWRR (IRR)"
                value={formatPercent(dashboard?.transactions?.mwrr || 0)}
                valueColor={
                  (dashboard?.transactions?.mwrr || 0) >= 0
                    ? "success.main"
                    : "error.main"
                }
                icon={<TrendingUpIcon color="success" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid item xs={12} md={3}>
          <Tooltip
            title="CAGR: Compound Annual Growth Rate. Shows the mean annual growth rate of the portfolio over time. Calculation: (Ending Value / Beginning Value)^(1/years) - 1."
            arrow
          >
            <Box>
              <MetricCard
                label="CAGR"
                value={formatPercent(dashboard?.transactions?.cagr || 0)}
                valueColor={
                  (dashboard?.transactions?.cagr || 0) >= 0
                    ? "success.main"
                    : "error.main"
                }
                icon={<TrendingUpIcon color="success" />}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Portfolio Performance Chart */}
      {performanceData.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Portfolio Performance (Last 30 Days)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: "#000" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1976d2"
                strokeWidth={2}
                dot={false}
                name="Portfolio Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Asset Allocation
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboard?.transactions?.asset_allocation}
                  dataKey="value"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) =>
                    `${entry.type}: ${entry.percentage?.toFixed(1)}%`
                  }
                >
                  {dashboard?.transactions?.asset_allocation?.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          ["#2196f3", "#4caf50", "#ff9800", "#9c27b0"][index]
                        }
                      />
                    )
                  )}
                </Pie>
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Market Value by Broker
            </Typography>
            {brokerSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={brokerSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                  <Bar dataKey="value" fill="#2196f3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">
                No broker data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Holdings
            </Typography>
            <Grid container spacing={2}>
              {dashboard?.transactions?.holdings?.slice(0, 4).map((holding) => (
                <Grid item xs={12} sm={6} md={3} key={holding.asset_id}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      {holding.symbol}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {holding.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {formatCurrency(holding.market_value || 0)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={
                        holding.unrealized_gain >= 0
                          ? "success.main"
                          : "error.main"
                      }
                    >
                      {holding.unrealized_gain >= 0 ? "+" : ""}
                      {formatPercent(holding.unrealized_gain_percent || 0)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
