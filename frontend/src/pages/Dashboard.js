import React, { useState, useEffect } from "react";
import { Container, Box, Typography, Grid, Tooltip } from "@mui/material";
import { MetricCard } from "../components/StyledCard";
import { useTheme } from "@mui/material/styles";
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  ShowChart as ShowChartIcon,
  Percent as PercentIcon,
} from "@mui/icons-material";

import AssetAllocationChart from "../components/AssetAllocationChart";
import PortfolioValueChart from "../components/PortfolioValueChart";
import MarketValueByBrokerChart from "../components/MarketValueByBrokerChart";
import MTMEvolutionChart from "../components/MTMEvolutionChart";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = () => {
  const theme = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [brokerSummary, setBrokerSummary] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [mtmEvolution, setMtmEvolution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadBrokerData();
    loadPerformanceData();
    loadReturnDetails();
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
          .filter((broker) => broker.value > 10) // Filter out brokers with negligible values
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

  const loadReturnDetails = async () => {
    try {
      const response = await analyticsAPI.getReturnDetails();
      const details = response.data;
      if (details && Array.isArray(details.cagr_evolution)) {
        const chartData = details.cagr_evolution.map((r) => ({
          year: String(r.year),
          mtm: r.mtm || 0,
          cagr: r.cagr !== null && r.cagr !== undefined ? r.cagr : null,
        }));
        setMtmEvolution(chartData);
      }
    } catch (error) {
      console.error("Error loading return details:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography> */}
      {/* Row 1: Portfolio Value Metrics */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
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
                valueColor={theme.palette.primary.main}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <Tooltip
            title="Holdings Market Value: Current fair market value of all investment positions based on latest market prices. Excludes cash. Calculation: Sum of (quantity × market price) for all holdings."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="Holdings Market Value"
                value={formatCurrency(
                  dashboard?.transactions?.holdings_market_value || 0,
                  0,
                )}
                valueColor="primary"
                subtitle={
                  dashboard?.transactions?.daily_pnl !== undefined ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          dashboard.transactions.daily_pnl >= 0
                            ? theme.palette.success.main
                            : theme.palette.error.main,
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
                        2,
                      )}
                      )
                    </Typography>
                  ) : undefined
                }
                icon={<TrendingUpIcon color="primary" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <Tooltip
            title="Unrealized P&L: Profit or loss on open positions that have not yet been closed. Calculation: Holdings Market Value - Cost Basis."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="Unrealized P&L"
                value={formatCurrency(
                  dashboard?.transactions?.unrealized_gain || 0,
                  0,
                )}
                valueColor={
                  (dashboard?.transactions?.unrealized_gain || 0) >= 0
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
                icon={<ShowChartIcon color="primary" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <Tooltip
            title="Return on Investment (ROI): Percentage return on invested capital in current holdings. Calculation: Unrealized P&L / Cost Basis × 100."
            arrow
          >
            <Box sx={{ height: "100%" }}>
              <MetricCard
                label="ROI %"
                value={formatPercent(
                  dashboard?.transactions?.unrealized_gain_percent || 0,
                )}
                valueColor={
                  (dashboard?.transactions?.unrealized_gain_percent || 0) >= 0
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
                icon={<PercentIcon color="primary" />}
                sx={{ height: "100%" }}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
      {/* Row 2: Performance & Funding Metrics */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <Tooltip
            title="Net Contributions: The total cash flow into your account, calculated as all deposits minus withdrawals. Includes both invested and uninvested cash. Calculation: Deposits - Withdrawals."
            arrow
          >
            <Box>
              <MetricCard
                label="Net Contributions"
                value={formatCurrency(
                  dashboard?.transactions?.net_contributions || 0,
                  0,
                )}
                valueColor={theme.palette.primary.main}
                icon={<AttachMoneyIcon color="warning" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <Tooltip
            title="Net Invested: Net capital currently allocated to holdings after accounting for purchases and sales. Calculation: Buy transactions - Sell transactions."
            arrow
          >
            <Box>
              <MetricCard
                label="Net Invested"
                value={formatCurrency(
                  dashboard?.transactions?.net_invested || 0,
                  0,
                )}
                valueColor={theme.palette.primary.main}
                icon={<AttachMoneyIcon color="warning" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
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
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
                icon={<TrendingUpIcon color="primary" />}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
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
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
                icon={<TrendingUpIcon color="primary" />}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
      {/* Portfolio Performance Chart */}
      {performanceData.length > 0 && (
        <PortfolioValueChart
          data={performanceData}
          title="Portfolio Performance (Last 30 Days)"
          height={300}
        />
      )}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={12}>
          <AssetAllocationChart
            data={dashboard.transactions.asset_allocation}
            title="Asset Allocation"
            height={300}
          />
        </Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={12}>
          <MarketValueByBrokerChart
            data={brokerSummary}
            title="Market Value by Broker"
            height={300}
          />
        </Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={12}>
          <MTMEvolutionChart
            data={mtmEvolution.length ? mtmEvolution : undefined}
            height={380}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
