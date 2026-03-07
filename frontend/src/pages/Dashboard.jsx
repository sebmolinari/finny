import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  CircularProgress,
  CardContent,
} from "@mui/material";
import { fadeInUpSx } from "../utils/animations";
import { MetricCard, StyledCard } from "../components/StyledCard";
import { useTheme } from "@mui/material/styles";
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ShowChart as ShowChartIcon,
  EmojiEvents as EmojiEventsIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";

import AssetAllocationChart from "../components/AssetAllocationChart";
import PortfolioValueChart from "../components/PortfolioValueChart";
import MarketValueByBrokerChart from "../components/MarketValueByBrokerChart";
import MTMEvolutionChart from "../components/MTMEvolutionChart";
import TrendCard from "../components/TrendCard";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";

// Helper: format a date to YYYY-MM-DD without timezone shift
function toDateInput(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const Dashboard = () => {
  const theme = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [brokerSummary, setBrokerSummary] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [sparklineData, setSparklineData] = useState([]);
  const [holdingsSparklineData, setHoldingsSparklineData] = useState([]);
  const [mtmEvolution, setMtmEvolution] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date range selector
  const [rangeMode, setRangeMode] = useState("ytd"); // 'ytd' | '12m' | 'inception' | 'custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(toDateInput(new Date()));
  const [inceptionDate, setInceptionDate] = useState(null);
  const [rangeMetrics, setRangeMetrics] = useState(null);
  const [rangeMetricsLoading, setRangeMetricsLoading] = useState(false);

  // Compute start/end for the current range mode
  const getActiveRange = useCallback(() => {
    const now = new Date();
    const todayStr = toDateInput(now);
    switch (rangeMode) {
      case "ytd": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { startDate: toDateInput(startOfYear), endDate: todayStr };
      }
      case "30d": {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { startDate: toDateInput(start), endDate: todayStr };
      }
      case "12m": {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        return { startDate: toDateInput(start), endDate: todayStr };
      }
      case "inception":
        return inceptionDate
          ? { startDate: inceptionDate, endDate: todayStr }
          : null;
      case "custom":
        return customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : null;
      default:
        return null;
    }
  }, [rangeMode, customStart, customEnd, inceptionDate]);

  useEffect(() => {
    loadDashboard();
    loadBrokerData();
    loadSparklineData();
    loadHoldingsSparklineData();
    loadReturnDetails();
    loadInceptionDate();
  }, []);

  // Compute a stable key that only changes when the resolved date range actually changes.
  // This prevents re-firing when inceptionDate loads but rangeMode is not "inception".
  const activeRangeKey = useMemo(() => {
    const range = getActiveRange();
    return range ? `${range.startDate}|${range.endDate}` : null;
  }, [getActiveRange]);

  // Reload performance chart + range metrics whenever the resolved range changes
  useEffect(() => {
    if (!activeRangeKey) return;
    loadPerformanceForRange();
    loadRangeMetrics();
  }, [activeRangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadInceptionDate = async () => {
    try {
      const response = await analyticsAPI.getInceptionDate();
      setInceptionDate(response.data.inception_date || null);
    } catch (error) {
      console.error("Error loading inception date:", error);
    }
  };

  const loadPerformanceForRange = async () => {
    const range = getActiveRange();
    if (!range) return;
    try {
      const response = await analyticsAPI.getPortfolioPerformance(
        undefined,
        undefined,
        range.startDate,
        range.endDate,
      );
      const perfData = response.data.map((item) => ({
        date: item.date,
        value: item.total_value,
      }));
      setPerformanceData(perfData);
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
  };

  const loadRangeMetrics = async () => {
    const range = getActiveRange();
    if (!range) {
      setRangeMetrics(null);
      return;
    }
    try {
      setRangeMetricsLoading(true);
      const response = await analyticsAPI.getDateRangeMetrics(
        range.startDate,
        range.endDate,
      );
      setRangeMetrics(response.data);
    } catch (error) {
      console.error("Error loading range metrics:", error);
      setRangeMetrics(null);
    } finally {
      setRangeMetricsLoading(false);
    }
  };

  const loadSparklineData = async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(31);
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
      const response = await analyticsAPI.getPortfolioPerformance(31, [
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

  // Best & Worst performers from holdings
  const holdings = dashboard?.transactions?.holdings || [];
  const holdingsWithCost = holdings.filter((h) => (h.cost_basis || 0) > 0);
  const sortedByPct = [...holdingsWithCost].sort(
    (a, b) => b.unrealized_gain_percent - a.unrealized_gain_percent,
  );
  const bestPerformers = sortedByPct.slice(0, 3);
  const worstPerformers = sortedByPct.slice(-3).reverse();

  // Chart title based on range
  const rangeLabel =
    rangeMode === "ytd"
      ? "Year-to-Date"
      : rangeMode === "30d"
        ? "Last 30 Days"
        : rangeMode === "12m"
          ? "Last 12 Months"
          : rangeMode === "inception"
            ? "All Time"
            : "Custom Range";

  return (
    <PageContainer>
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip
            title="Net Asset Value (NAV): Total market value of portfolio holdings plus available cash. The comprehensive value of all portfolio assets. Calculation: Holdings Market Value + Cash Balance."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(1) }}>
              <TrendCard
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
              <TrendCard
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
            title="Unrealized P&L: Profit or loss on open positions that have not yet been closed. Excl. real estate. Calculation: Liquid Market Value - Cost Basis."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(3) }}>
              <TrendCard
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
            <Box sx={{ ...fadeInUpSx(4) }}>
              <MetricCard
                title="Liquidity"
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
            <Box sx={{ ...fadeInUpSx(5) }}>
              <MetricCard
                title="MWRR (IRR)"
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
            <Box sx={{ ...fadeInUpSx(6) }}>
              <MetricCard
                title="CAGR"
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
      {/* Portfolio Performance Chart with Date Range Selector */}
      <PortfolioValueChart
        data={performanceData}
        title={`Portfolio Performance — ${rangeLabel}`}
        height={300}
        controls={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <ToggleButtonGroup
              value={rangeMode}
              exclusive
              onChange={(_, v) => v && setRangeMode(v)}
              size="small"
            >
              <ToggleButton value="ytd">YTD</ToggleButton>
              <ToggleButton value="30d">1M</ToggleButton>
              <ToggleButton value="12m">1Y</ToggleButton>
              <ToggleButton value="inception" disabled={!inceptionDate}>
                All
              </ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>

            {rangeMode === "custom" && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  type="date"
                  label="Start"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
                <TextField
                  type="date"
                  label="End"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
              </Box>
            )}

            {rangeMetricsLoading ? (
              <CircularProgress size={18} sx={{ ml: "auto" }} />
            ) : rangeMetrics ? (
              <Box sx={{ display: "flex", gap: 2.5, ml: "auto" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    NAV Change
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={
                      rangeMetrics.nav_change_pct >= 0
                        ? theme.palette.success.main
                        : theme.palette.error.main
                    }
                  >
                    {rangeMetrics.nav_change_pct >= 0 ? "+" : ""}
                    {rangeMetrics.nav_change_pct.toFixed(2)}%{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      ({formatCurrency(rangeMetrics.nav_change, 0)})
                    </Typography>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Period MWRR
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={
                      rangeMetrics.mwrr >= 0
                        ? theme.palette.success.main
                        : theme.palette.error.main
                    }
                  >
                    {rangeMetrics.mwrr >= 0 ? "+" : ""}
                    {rangeMetrics.mwrr.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            ) : null}
          </Box>
        }
      />
      <MTMEvolutionChart
        data={mtmEvolution}
        title="Net Asset Value Evolution"
        height={380}
      />

      {/* Best & Worst Performers */}
      {holdingsWithCost.length > 0 && (
        <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StyledCard animIndex={9}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <EmojiEventsIcon
                    fontSize="small"
                    sx={{ color: theme.palette.success.main }}
                  />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Best Performers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (vs. cost basis)
                  </Typography>
                </Box>
                {bestPerformers.map((h) => (
                  <Box
                    key={`best-${h.asset_id}-${h.broker_id}`}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.75,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {h.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {h.broker_name || "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={theme.palette.success.main}
                      >
                        +{h.unrealized_gain_percent.toFixed(2)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(h.unrealized_gain, 0)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StyledCard animIndex={10}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <TrendingDownIcon
                    fontSize="small"
                    sx={{ color: theme.palette.error.main }}
                  />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Worst Performers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (vs. cost basis)
                  </Typography>
                </Box>
                {worstPerformers.map((h) => (
                  <Box
                    key={`worst-${h.asset_id}-${h.broker_id}`}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.75,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {h.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {h.broker_name || "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          h.unrealized_gain_percent < 0
                            ? theme.palette.error.main
                            : theme.palette.success.main
                        }
                      >
                        {h.unrealized_gain_percent >= 0 ? "+" : ""}
                        {h.unrealized_gain_percent.toFixed(2)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(h.unrealized_gain, 0)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AssetAllocationChart
            data={dashboard.transactions.asset_allocation}
            title="Asset Allocation"
            subtitle="Liquid holdings only"
            height={300}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MarketValueByBrokerChart
            data={brokerSummary}
            title="Exposure by Broker"
            subtitle="Include all holdings"
            height={300}
          />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;
