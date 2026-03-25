import { useState, useEffect } from "react";
import { Box, Grid, Tooltip, Alert, Button } from "@mui/material";
import { fadeInUpSx } from "../../utils/animations";
import { MetricCard } from "../../components/StyledCard";
import { useTheme } from "@mui/material/styles";
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ShowChart as ShowChartIcon,
} from "@mui/icons-material";

import AssetAllocationChart from "../../components/AssetAllocationChart";
import PortfolioValueChart from "../../components/PortfolioValueChart";
import MarketValueByBrokerChart from "../../components/MarketValueByBrokerChart";
import MTMEvolutionChart from "../../components/MTMEvolutionChart";
import TrendCard from "../../components/TrendCard";
import { BENCHMARKS } from "../../constants/benchmarks";

import { formatDate } from "../../utils/dateUtils";
import { formatCurrency, formatPercent } from "../../utils/formatNumber";
import LoadingSpinner from "../../components/LoadingSpinner";
import PageContainer from "../../components/PageContainer";
import { useUserSettings } from "../../hooks/useUserSettings";

import { useDateRange } from "./hooks/useDateRange";
import { useDashboard } from "./hooks/useDashboard";
import { PerformersList } from "./components/PerformersList";
import { DateRangeControls } from "./components/DateRangeControls";

const Dashboard = () => {
  const theme = useTheme();
  const { timezone: userTimezone, dateFormat: userDateFormat } = useUserSettings();

  // benchmarkSymbol lives here so it can be passed to both useDashboard and DateRangeControls
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("");

  // inceptionDate is loaded by useDashboard but needed by useDateRange.
  // We keep a local copy that gets synced via useEffect once it arrives.
  const [inceptionDate, setInceptionDate] = useState(null);

  const {
    rangeMode,
    setRangeMode,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    getActiveRange,
    activeRangeKey,
    rangeLabel,
  } = useDateRange(userTimezone, inceptionDate);

  const {
    dashboard,
    brokerSummary,
    sparklineData,
    holdingsSparklineData,
    mtmEvolution,
    performanceData,
    rangeMetrics,
    rangeMetricsLoading,
    benchmarkData,
    inceptionDate: loadedInceptionDate,
    loading,
    error,
    reload,
  } = useDashboard(getActiveRange, activeRangeKey, benchmarkSymbol);

  // Sync inceptionDate back into local state once it loads, so useDateRange
  // can enable the "All" toggle and compute the inception range correctly.
  useEffect(() => {
    if (loadedInceptionDate !== null) {
      setInceptionDate(loadedInceptionDate);
    }
  }, [loadedInceptionDate]);

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={reload}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  // Derive NAV sparkline data from last 30 days
  const navSparkData = sparklineData.map((d) => d.value);
  const navXAxisData = sparklineData.map((d) => formatDate(d.date, userDateFormat));
  const navFirst = navSparkData[0] ?? 0;
  const navLast = navSparkData[navSparkData.length - 1] ?? 0;
  const navChangePct = navFirst > 0 ? ((navLast - navFirst) / navFirst) * 100 : 0;
  const navTrend = navChangePct > 0 ? "up" : navChangePct < 0 ? "down" : "neutral";
  const navTrendLabel =
    navChangePct >= 0 ? `+${navChangePct.toFixed(2)}%` : `${navChangePct.toFixed(2)}%`;
  const navInterval =
    sparklineData.length >= 2
      ? `Period: ${formatDate(sparklineData[0].date, userDateFormat)} – ${formatDate(sparklineData[sparklineData.length - 1].date, userDateFormat)}`
      : "Last 30 days";

  // Derive Liquid Holdings sparkline (30 days, real estate excluded)
  const holdingsSparkValues = holdingsSparklineData.map((d) => d.value);
  const holdingsXAxisData = holdingsSparklineData.map((d) => formatDate(d.date, userDateFormat));
  const holdingsFirst = holdingsSparkValues[0] ?? 0;
  const holdingsLast = holdingsSparkValues[holdingsSparkValues.length - 1] ?? 0;
  const holdingsChangePct =
    holdingsFirst > 0 ? ((holdingsLast - holdingsFirst) / holdingsFirst) * 100 : 0;
  const holdingsTrend =
    holdingsChangePct > 0 ? "up" : holdingsChangePct < 0 ? "down" : "neutral";
  const holdingsTrendLabel =
    holdingsChangePct >= 0
      ? `+${holdingsChangePct.toFixed(2)}%`
      : `${holdingsChangePct.toFixed(2)}%`;
  const holdingsInterval =
    holdingsSparklineData.length >= 2
      ? `Period: ${formatDate(holdingsSparklineData[0].date, userDateFormat)} – ${formatDate(holdingsSparklineData[holdingsSparklineData.length - 1].date, userDateFormat)}`
      : "Last 30 days";

  // Best & Worst performers from holdings
  const holdings = dashboard?.transactions?.holdings || [];
  const holdingsWithCost = holdings.filter((h) => (h.cost_basis || 0) > 0);
  const sortedByPct = [...holdingsWithCost].sort(
    (a, b) => b.unrealized_gain_percent - a.unrealized_gain_percent,
  );
  const bestPerformers = sortedByPct.slice(0, 3);
  const worstPerformers = sortedByPct.slice(-3).reverse();

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

        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip
            title="Liquid Holdings: Current fair market value of tradeable investment positions. Excludes cash and real estate. Calculation: Sum of (quantity × market price) for equity, fixed income, crypto, and currency holdings."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(2) }}>
              <TrendCard
                title="Liquid Holdings"
                icon={<TrendingUpIcon color="primary" />}
                value={formatCurrency(dashboard?.transactions?.holdings_market_value || 0, 0)}
                interval={holdingsInterval}
                trend={holdingsTrend}
                trendLabel={holdingsTrendLabel}
                data={holdingsSparkValues.length > 1 ? holdingsSparkValues : [0, 0]}
                xAxisData={holdingsXAxisData.length > 1 ? holdingsXAxisData : ["-", "-"]}
              />
            </Box>
          </Tooltip>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Tooltip
            title="Unrealized P&L: Profit or loss on open positions that have not yet been closed. Excl. real estate. Calculation: Liquid Market Value - Cost Basis."
            arrow
          >
            <Box sx={{ height: "100%", ...fadeInUpSx(3) }}>
              <TrendCard
                title="Unrealized P&L"
                icon={<ShowChartIcon color="primary" />}
                value={formatCurrency(dashboard?.transactions?.unrealized_gain || 0, 0)}
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
        <Grid size={{ xs: 12, md: 4 }}>
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

        <Grid size={{ xs: 12, md: 4 }}>
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

        <Grid size={{ xs: 12, md: 4 }}>
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
        data={benchmarkData?.portfolio_series || performanceData}
        title={`Net Asset Value — ${rangeLabel}`}
        height={300}
        benchmarkData={benchmarkData?.benchmark_series || null}
        benchmarkLabel={
          BENCHMARKS.find((b) => b.symbol === benchmarkSymbol)?.label || benchmarkSymbol
        }
        normalized={!!benchmarkData}
        controls={
          <DateRangeControls
            rangeMode={rangeMode}
            setRangeMode={setRangeMode}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            inceptionDate={inceptionDate}
            benchmarkSymbol={benchmarkSymbol}
            setBenchmarkSymbol={setBenchmarkSymbol}
            rangeMetrics={rangeMetrics}
            rangeMetricsLoading={rangeMetricsLoading}
          />
        }
      />

      <MTMEvolutionChart data={mtmEvolution} title="Net Asset Value Evolution" height={380} />

      {/* Best & Worst Performers */}
      {holdingsWithCost.length > 0 && (
        <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
          <PerformersList bestPerformers={bestPerformers} worstPerformers={worstPerformers} />
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
