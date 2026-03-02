import React, { useState, useEffect } from "react";
import { Box, Typography, Grid, Tooltip } from "@mui/material";
import { fadeInUpSx } from "../utils/animations";
import { MetricCard } from "../components/StyledCard";
import { useTheme } from "@mui/material/styles";
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ShowChart as ShowChartIcon,
} from "@mui/icons-material";

import AssetAllocationChart from "../components/AssetAllocationChart";
import PortfolioValueChart from "../components/PortfolioValueChart";
import MarketValueByBrokerChart from "../components/MarketValueByBrokerChart";
import MTMEvolutionChart from "../components/MTMEvolutionChart";
import StatCard from "../components/StatCard";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";

const Dashboard = () => {
  const theme = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [brokerSummary, setBrokerSummary] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [sparklineData, setSparklineData] = useState([]);
  const [holdingsSparklineData, setHoldingsSparklineData] = useState([]);
  const [mtmEvolution, setMtmEvolution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadBrokerData();
    loadPerformanceData();
    loadSparklineData();
    loadHoldingsSparklineData();
    loadReturnDetails();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getPortfolioAnalytics(["realestate"]);
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
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const ytdDays = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24));
      const response = await analyticsAPI.getPortfolioPerformance(ytdDays);
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

  const loadSparklineData = async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(30);
      const sparkData = response.data.map((item) => ({
        date: item.date,
        value: item.total_value,
      }));
      setSparklineData(sparkData);
    } catch (error) {
      console.error("Error loading sparkline data:", error);
    }
  };

  const loadHoldingsSparklineData = async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(30, [
        "realestate",
      ]);
      const data = response.data.map((item) => ({
        date: item.date,
        value: item.total_value,
      }));
      setHoldingsSparklineData(data);
    } catch (error) {
      console.error("Error loading holdings sparkline data:", error);
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

  // Derive NAV sparkline data from last 30 days
  const navSparkData = sparklineData.map((d) => d.value);
  const navXAxisData = sparklineData.map((d) =>
    new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    }),
  );
  const navFirst = navSparkData[0] ?? 0;
  const navLast = navSparkData[navSparkData.length - 1] ?? 0;
  const navChangePct =
    navFirst > 0 ? ((navLast - navFirst) / navFirst) * 100 : 0;
  const navTrend =
    navChangePct > 0 ? "up" : navChangePct < 0 ? "down" : "neutral";
  const navTrendLabel =
    navChangePct >= 0
      ? `+${navChangePct.toFixed(2)}%`
      : `${navChangePct.toFixed(2)}%`;
  const navInterval =
    sparklineData.length >= 2
      ? `Period: ${new Date(sparklineData[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(sparklineData[sparklineData.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "Last 30 days";

  // Derive Liquid Holdings sparkline (30 days, real estate excluded)
  const holdingsSparkValues = holdingsSparklineData.map((d) => d.value);
  const holdingsXAxisData = holdingsSparklineData.map((d) =>
    new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    }),
  );
  const holdingsFirst = holdingsSparkValues[0] ?? 0;
  const holdingsLast = holdingsSparkValues[holdingsSparkValues.length - 1] ?? 0;
  const holdingsChangePct =
    holdingsFirst > 0
      ? ((holdingsLast - holdingsFirst) / holdingsFirst) * 100
      : 0;
  const holdingsTrend =
    holdingsChangePct > 0 ? "up" : holdingsChangePct < 0 ? "down" : "neutral";
  const holdingsTrendLabel =
    holdingsChangePct >= 0
      ? `+${holdingsChangePct.toFixed(2)}%`
      : `${holdingsChangePct.toFixed(2)}%`;
  const holdingsInterval =
    holdingsSparklineData.length >= 2
      ? `Period: ${new Date(holdingsSparklineData[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(holdingsSparklineData[holdingsSparklineData.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "Last 30 days";

  return (
    <PageContainer>
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip
            title="Net Asset Value (NAV): Total market value of portfolio holdings plus available cash. The comprehensive value of all portfolio assets. Calculation: Holdings Market Value + Cash Balance."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(1) }}>
              <StatCard
                title="Net Asset Value"
                icon={<AccountBalanceIcon color="primary" />}
                value={formatCurrency(dashboard?.nav || 0, 0)}
                interval={navInterval}
                trend={navTrend}
                trendLabel={navTrendLabel}
                data={navSparkData.length > 1 ? navSparkData : [0, 0]}
                xAxisData={navXAxisData.length > 1 ? navXAxisData : ["–", "–"]}
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
            title="Liquid Holdings: Current fair market value of tradeable investment positions. Excludes cash and real estate. Calculation: Sum of (quantity × market price) for equity, fixed income, crypto, and currency holdings."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(2) }}>
              <StatCard
                title="Liquid Holdings"
                icon={<TrendingUpIcon color="primary" />}
                value={formatCurrency(
                  dashboard?.transactions?.holdings_market_value || 0,
                  0,
                )}
                interval={holdingsInterval}
                trend={holdingsTrend}
                trendLabel={holdingsTrendLabel}
                data={
                  holdingsSparkValues.length > 1 ? holdingsSparkValues : [0, 0]
                }
                xAxisData={
                  holdingsXAxisData.length > 1 ? holdingsXAxisData : ["-", "-"]
                }
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
            title="Unrealized P&L: Profit or loss on open positions that have not yet been closed. Excl. real estate. Calculation: Holdings Market Value - Cost Basis."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(3) }}>
              <StatCard
                title="Unrealized P&L"
                icon={<ShowChartIcon color="primary" />}
                value={formatCurrency(
                  dashboard?.transactions?.unrealized_gain || 0,
                  0,
                )}
                valueColor={
                  (dashboard?.transactions?.unrealized_gain || 0) > 0
                    ? theme.palette.success.main
                    : (dashboard?.transactions?.unrealized_gain || 0) < 0
                      ? theme.palette.error.main
                      : theme.palette.text.secondary
                }
                interval={
                  dashboard?.transactions?.daily_pnl !== undefined
                    ? `Daily P&L: ${dashboard.transactions.daily_pnl >= 0 ? "+" : ""}${formatCurrency(dashboard.transactions.daily_pnl, 0)}`
                    : "Daily P&L unavailable"
                }
                intervalColor={
                  dashboard?.transactions?.daily_pnl > 0
                    ? theme.palette.success.main
                    : dashboard?.transactions?.daily_pnl < 0
                      ? theme.palette.error.main
                      : undefined
                }
                trend={
                  (dashboard?.transactions?.unrealized_gain || 0) > 0
                    ? "up"
                    : (dashboard?.transactions?.unrealized_gain || 0) < 0
                      ? "down"
                      : "neutral"
                }
                trendLabel={
                  (dashboard?.transactions?.unrealized_gain_percent || 0) >= 0
                    ? `+${(dashboard?.transactions?.unrealized_gain_percent || 0).toFixed(2)}%`
                    : `${(dashboard?.transactions?.unrealized_gain_percent || 0).toFixed(2)}%`
                }
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
      {/* Row 2: Performance & Funding Metrics */}
      <Grid container spacing={2.5} sx={{ mt: 1 }}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Tooltip
            title="Liquidity: Total available cash and liquid assets not invested in holdings. Includes cash balance and liquidity-type assets."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(5) }}>
              <MetricCard
                label="Liquidity"
                icon={<AccountBalanceWalletIcon color="primary" />}
                value={formatCurrency(
                  (dashboard?.transactions?.cash_balance || 0) +
                    (dashboard?.transactions?.liquidity_balance || 0),
                  0,
                )}
                valueFontWeight={400}
                valueColor={theme.palette.primary.main}
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
            title="MWRR (IRR): Money-Weighted Rate of Return, also known as Internal Rate of Return. Reflects the annualized return considering the timing and size of cash flows in/out. Calculation: IRR of all portfolio cash flows."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(6) }}>
              <MetricCard
                label="MWRR (IRR)"
                value={formatPercent(dashboard?.transactions?.mwrr || 0)}
                valueFontWeight={400}
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
            md: 4,
          }}
        >
          <Tooltip
            title="CAGR: Compound Annual Growth Rate. Shows the mean annual growth rate of the portfolio over time. Calculation: (Ending Value / Beginning Value)^(1/years) - 1."
            arrow
          >
            <Box sx={{ ...fadeInUpSx(7) }}>
              <MetricCard
                label="CAGR"
                value={formatPercent(dashboard?.transactions?.cagr || 0)}
                valueFontWeight={400}
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
      <PortfolioValueChart
        data={performanceData}
        title="Portfolio Performance (YTD)"
        height={300}
      />
      <AssetAllocationChart
        data={dashboard.transactions.asset_allocation}
        title="Asset Allocation"
        height={300}
      />
      <MarketValueByBrokerChart
        data={brokerSummary}
        title="NAV by Broker"
        height={300}
      />
      <MTMEvolutionChart
        data={mtmEvolution}
        title="NAV Evolution"
        height={380}
      />
    </PageContainer>
  );
};

export default Dashboard;
