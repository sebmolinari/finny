import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Tooltip as MuiTooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  EventNote as EventNoteIcon,
  Restore as RestoreIcon,
  BarChart as BarChartIcon,
  Insights as InsightsIcon,
  StackedLineChart as StackedLineChartIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { analyticsAPI } from "../api/api";
import { getTodayInTimezone } from "../utils/dateUtils";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
} from "../utils/formatNumber";
import { MetricCard, StyledCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import { useUserSettings } from "../hooks/useUserSettings";


const RANGE_OPTIONS = [
  { label: "YTD", value: "ytd", days: null },
  { label: "1Y", value: "1y", days: 365 },
  { label: "2Y", value: "2y", days: 730 },
  { label: "3Y", value: "3y", days: 1095 },
  { label: "5Y", value: "5y", days: 1825 },
  { label: "All", value: "inception", days: null },
  { label: "Custom", value: "custom", days: null },
];

export default function RiskMetrics() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { timezone } = useUserSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState("ytd");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(() => getTodayInTimezone("UTC"));
  const [corrData, setCorrData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const opt = RANGE_OPTIONS.find((o) => o.value === rangeMode);
      let startDate = null;
      let endDate = null;
      let days = opt?.days ?? 365;

      if (rangeMode === "custom") {
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        startDate = customStart;
        endDate = customEnd;
        days = 365;
      } else if (rangeMode === "ytd") {
        const todayStr = getTodayInTimezone(timezone || "UTC");
        startDate = `${todayStr.substring(0, 4)}-01-01`;
        endDate = todayStr;
        days = 365;
      } else if (rangeMode === "inception") {
        days = 3650; // 10 years max for inception — backend will clip to first transaction
      }

      const [res, corrRes] = await Promise.allSettled([
        analyticsAPI.getRiskMetrics(days, startDate, endDate),
        analyticsAPI.getCorrelation(days),
      ]);
      if (res.status === "fulfilled") setData(res.value.data);
      if (corrRes.status === "fulfilled") setCorrData(corrRes.value.data);
    } catch (err) {
      console.error("Error loading risk metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [rangeMode, customStart, customEnd, timezone]);

  useEffect(() => {
    setCustomEnd(getTodayInTimezone(timezone || "UTC"));
  }, [timezone]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner maxWidth="lg" />;

  const navSeries = data?.nav_series ?? [];
  const rollingVol = data?.rolling_volatility ?? [];
  const maxDD = data?.max_drawdown;
  const recoveryDays = data?.recovery_days;
  const recoveryDate = data?.recovery_date;
  const sharpeRatio = data?.sharpe_ratio;
  const sharpeComponents = data?.sharpe_components;
  const sortinoRatio = data?.sortino_ratio;
  const sortinoComponents = data?.sortino_components;

  // Build dual-axis chart data — align nav + volatility by date
  const volMap = Object.fromEntries(
    rollingVol.map((v) => [v.date, v.volatility]),
  );
  const chartData = navSeries.map((n) => ({
    date: n.date,
    nav: n.value,
    volatility: volMap[n.date] ?? null,
  }));

  // Drawdown series: running drawdown as % from peak
  let runningPeak = navSeries[0]?.value ?? 0;
  const drawdownSeries = navSeries.map((n) => {
    if (n.value > runningPeak) runningPeak = n.value;
    const dd =
      runningPeak > 0 ? ((n.value - runningPeak) / runningPeak) * 100 : 0;
    return { date: n.date, drawdown: dd };
  });

  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };

  return (
    <PageContainer>
      {/* Range selector */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          ...fadeInUpSx(1),
        }}
      >
        <ToggleButtonGroup
          value={rangeMode}
          exclusive
          onChange={(_, v) => v && setRangeMode(v)}
          size="small"
        >
          {RANGE_OPTIONS.map((o) => (
            <ToggleButton key={o.value} value={o.value}>
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {rangeMode === "custom" && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Start"
              type="date"
              size="small"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End"
              type="date"
              size="small"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="The largest peak-to-trough decline in portfolio value during the selected period. Shows how much you would have lost if you bought at the peak and sold at the worst point."
            arrow
          >
            <Box sx={fadeInUpSx(2)}>
              <MetricCard
                title="Max Drawdown"
                value={maxDD ? formatPercent(maxDD.value, 2) : "—"}
                valueColor={maxDD ? theme.palette.error.main : undefined}
                icon={<TrendingDownIcon color="error" fontSize="small" />}
                subtitle={
                  maxDD ? (
                    <Typography variant="caption" color="text.secondary">
                      {maxDD.start_date} → {maxDD.end_date}
                    </Typography>
                  ) : null
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="The portfolio value at the peak that preceded the worst decline (max drawdown). This is not necessarily the highest point in the whole period — it is specifically the high-water mark before the largest drop. The trough is the lowest value reached after that peak."
            arrow
          >
            <Box sx={fadeInUpSx(3)}>
              <MetricCard
                title="Drawdown Peak"
                value={maxDD ? formatCurrency(maxDD.peak_value) : "—"}
                icon={<ShowChartIcon color="primary" fontSize="small" />}
                subtitle={
                  maxDD ? (
                    <Typography variant="caption" color="text.secondary">
                      Trough: {formatCurrency(maxDD.trough_value)}
                    </Typography>
                  ) : null
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="How many days it took for the portfolio to climb back to its prior peak after the maximum drawdown trough. 'Not yet recovered' means the portfolio is still below its peak."
            arrow
          >
            <Box sx={fadeInUpSx(4)}>
              <MetricCard
                title="Recovery Time"
                value={
                  recoveryDays !== null
                    ? `${recoveryDays} days`
                    : "Not yet recovered"
                }
                valueColor={
                  recoveryDays !== null
                    ? theme.palette.success.main
                    : theme.palette.warning.main
                }
                icon={<RestoreIcon fontSize="small" />}
                subtitle={
                  recoveryDate ? (
                    <Typography variant="caption" color="text.secondary">
                      Recovered on {recoveryDate}
                    </Typography>
                  ) : null
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="Annualised volatility computed from the last 30 daily returns (σ × √252). Higher values mean the portfolio value has been swinging more widely day-to-day."
            arrow
          >
            <Box sx={fadeInUpSx(5)}>
              <MetricCard
                title="Latest 30-Day Volatility"
                value={
                  rollingVol.length > 0
                    ? formatPercent(
                        rollingVol[rollingVol.length - 1].volatility,
                        1,
                      )
                    : "—"
                }
                icon={<EventNoteIcon color="secondary" fontSize="small" />}
                subtitle={
                  <Typography variant="caption" color="text.secondary">
                    Annualised (σ × √252)
                  </Typography>
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="Annualised return over the selected period, calculated as (End NAV / Start NAV)^(252 / trading days) − 1. This is the same return figure used in the Sharpe and Sortino ratio numerators."
            arrow
          >
            <Box sx={fadeInUpSx(6)}>
              <MetricCard
                title="Annualised Return"
                value={sharpeComponents ? formatPercent(sharpeComponents.annualized_return, 2) : "—"}
                valueColor={
                  sharpeComponents
                    ? sharpeComponents.annualized_return >= 0
                      ? theme.palette.success.main
                      : theme.palette.error.main
                    : undefined
                }
                icon={<TrendingUpIcon color="success" fontSize="small" />}
                subtitle={
                  <Typography variant="caption" color="text.secondary">
                    Over selected period
                  </Typography>
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="Full-period annualised volatility: std dev of all daily returns in the selected range × √252. This is the denominator used in the Sharpe Ratio, as opposed to the rolling 30-day volatility shown in the card above."
            arrow
          >
            <Box sx={fadeInUpSx(7)}>
              <MetricCard
                title="Period Volatility"
                value={sharpeComponents ? formatPercent(sharpeComponents.volatility, 2) : "—"}
                icon={<StackedLineChartIcon color="warning" fontSize="small" />}
                subtitle={
                  <Typography variant="caption" color="text.secondary">
                    Annualised (full period)
                  </Typography>
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="Sharpe Ratio = (Annualised Return − Risk-Free Rate) / Annualised Volatility. Uses full-period volatility (std dev of all daily returns × √252). Above 1 is generally considered good. Configure the risk-free rate in Settings."
            arrow
          >
            <Box sx={fadeInUpSx(8)}>
              <MetricCard
                title="Sharpe Ratio"
                value={sharpeRatio !== null && sharpeRatio !== undefined ? formatNumber(sharpeRatio, 2) : "—"}
                valueColor={
                  sharpeRatio !== null && sharpeRatio !== undefined
                    ? sharpeRatio >= 1
                      ? theme.palette.success.main
                      : sharpeRatio >= 0
                      ? theme.palette.warning.main
                      : theme.palette.error.main
                    : undefined
                }
                icon={<BarChartIcon color="primary" fontSize="small" />}
                subtitle={
                  <Typography variant="caption" color="text.secondary">
                    {sharpeComponents
                      ? `Ret ${sharpeComponents.annualized_return}% · Vol ${sharpeComponents.volatility}% · Rf ${sharpeComponents.risk_free_rate}%`
                      : "Return per unit of risk"}
                  </Typography>
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MuiTooltip
            title="Sortino Ratio = (Annualised Return − Risk-Free Rate) / Downside Deviation. Only penalises downside volatility (std dev of negative daily returns × √252). Higher is better. Configure the risk-free rate in Settings."
            arrow
          >
            <Box sx={fadeInUpSx(9)}>
              <MetricCard
                title="Sortino Ratio"
                value={sortinoRatio !== null && sortinoRatio !== undefined ? formatNumber(sortinoRatio, 2) : "—"}
                valueColor={
                  sortinoRatio !== null && sortinoRatio !== undefined
                    ? sortinoRatio >= 1
                      ? theme.palette.success.main
                      : sortinoRatio >= 0
                      ? theme.palette.warning.main
                      : theme.palette.error.main
                    : undefined
                }
                icon={<InsightsIcon color="secondary" fontSize="small" />}
                subtitle={
                  <Typography variant="caption" color="text.secondary">
                    {sortinoComponents
                      ? `Ret ${sortinoComponents.annualized_return}% · DD ${sortinoComponents.downside_deviation}% · Rf ${sortinoComponents.risk_free_rate}%`
                      : "Return per unit of downside risk"}
                  </Typography>
                }
              />
            </Box>
          </MuiTooltip>
        </Grid>
      </Grid>

      {/* NAV + Volatility chart */}
      <Grid container spacing={2}>
        <Grid size={12}>
          <Box sx={fadeInUpSx(8)}>
            <StyledCard>
              <Box sx={{ p: 2, pb: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Portfolio NAV & Rolling 30-Day Volatility
                </Typography>
              </Box>
              <Box sx={{ p: 2, height: 340 }}>
                {chartData.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No data available for this period.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme.palette.divider}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(d) => d.slice(5)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="nav"
                        orientation="left"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                        width={60}
                      />
                      <YAxis
                        yAxisId="vol"
                        orientation="right"
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        tick={{ fontSize: 11 }}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) =>
                          name === "nav"
                            ? [formatCurrency(value), "NAV"]
                            : [
                                value !== null
                                  ? `${formatNumber(value, 1)}%`
                                  : "—",
                                "Volatility",
                              ]
                        }
                        labelFormatter={(l) => `Date: ${l}`}
                      />
                      <Legend />
                      <Area
                        yAxisId="nav"
                        type="monotone"
                        dataKey="nav"
                        name="nav"
                        fill={theme.palette.primary.main + "22"}
                        stroke={theme.palette.primary.main}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Line
                        yAxisId="vol"
                        type="monotone"
                        dataKey="volatility"
                        name="volatility"
                        stroke={theme.palette.warning.main}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>

        {/* Drawdown chart */}
        <Grid size={12}>
          <Box sx={fadeInUpSx(9)}>
            <StyledCard>
              <Box sx={{ p: 2, pb: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Running Drawdown
                </Typography>
              </Box>
              <Box sx={{ p: 2, height: 340 }}>
                {drawdownSeries.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No data available.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={drawdownSeries}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme.palette.divider}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(d) => d.slice(5)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        tick={{ fontSize: 11 }}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [
                          `${formatNumber(v, 2)}%`,
                          "Drawdown",
                        ]}
                        labelFormatter={(l) => `Date: ${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="drawdown"
                        name="Drawdown"
                        fill={theme.palette.error.main + "33"}
                        stroke={theme.palette.error.main}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>
      {/* Correlation Matrix */}
      {corrData && corrData.assets && corrData.assets.length >= 2 && (
        <Box sx={{ mt: 2, ...fadeInUpSx(10) }}>
          <StyledCard>
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Asset Return Correlation Matrix
              </Typography>
              <Typography variant="caption" color="text.secondary">
                How similarly each pair of assets moves day-to-day over the selected period.{" "}
                <strong>+1.00</strong> = always move together &nbsp;·&nbsp;{" "}
                <strong>0.00</strong> = no relationship &nbsp;·&nbsp;{" "}
                <strong>−1.00</strong> = always move in opposite directions.
                Low correlation between assets reduces overall portfolio risk.
              </Typography>
            </Box>
            <Box sx={{ p: 2, overflowX: "auto" }}>
              <Paper variant="outlined" sx={{ display: "inline-block", minWidth: "100%" }}>
                <Table size="small" sx={{ borderCollapse: "collapse" }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 70, fontSize: 12 }} />
                      {corrData.assets.map((a) => (
                        <TableCell
                          key={a.id}
                          align="center"
                          sx={{ fontWeight: 700, fontSize: 11, minWidth: 70, px: 0.5 }}
                        >
                          {a.symbol}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {corrData.assets.map((rowAsset, i) => (
                      <TableRow key={rowAsset.id}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>
                          {rowAsset.symbol}
                        </TableCell>
                        {corrData.matrix[i].map((r, j) => {
                          const isDiag = i === j;
                          const val = r !== null ? r : null;

                          let bg = theme.palette.action.hover;
                          let textColor = theme.palette.text.primary;
                          if (isDiag) {
                            bg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
                          } else if (val !== null) {
                            const absR = Math.abs(val);
                            const lightness = isDark
                              ? Math.round(20 + absR * 25)
                              : Math.round(95 - absR * 45);
                            bg = val >= 0
                              ? `hsl(142, 55%, ${lightness}%)`
                              : `hsl(0, 55%, ${lightness}%)`;
                            if (!isDark && absR > 0.6) textColor = "#fff";
                            if (isDark && absR > 0.4) textColor = "#fff";
                          }

                          const corrLabel = (v) => {
                            const a = Math.abs(v);
                            if (a >= 0.8) return v >= 0 ? "Very strong positive" : "Very strong negative";
                            if (a >= 0.6) return v >= 0 ? "Strong positive" : "Strong negative";
                            if (a >= 0.4) return v >= 0 ? "Moderate positive" : "Moderate negative";
                            if (a >= 0.2) return v >= 0 ? "Weak positive" : "Weak negative";
                            return "Very weak / no correlation";
                          };

                          const tooltipText = isDiag
                            ? `${rowAsset.symbol}: an asset always correlates perfectly with itself`
                            : val !== null
                            ? `${rowAsset.symbol} vs ${corrData.assets[j].symbol}: ${val.toFixed(3)} — ${corrLabel(val)}`
                            : "Insufficient overlapping price data";

                          return (
                            <MuiTooltip key={j} title={tooltipText} arrow>
                              <TableCell
                                align="center"
                                sx={{
                                  backgroundColor: bg,
                                  fontSize: 11,
                                  fontWeight: isDiag ? 600 : 400,
                                  color: textColor,
                                  cursor: "default",
                                  px: 0.5,
                                  py: 1,
                                  minWidth: 60,
                                }}
                              >
                                {isDiag ? "—" : val !== null ? val.toFixed(2) : "—"}
                              </TableCell>
                            </MuiTooltip>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              {/* Colour legend */}
              <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  −1.00
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 10,
                    borderRadius: 1,
                    background: isDark
                      ? "linear-gradient(to right, hsl(0,55%,45%), hsl(0,55%,20%), rgba(255,255,255,0.08), hsl(142,55%,20%), hsl(142,55%,45%))"
                      : "linear-gradient(to right, hsl(0,55%,50%), hsl(0,55%,95%), white, hsl(142,55%,95%), hsl(142,55%,50%))",
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  +1.00
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Red = negative &nbsp;·&nbsp; White/grey = neutral &nbsp;·&nbsp; Green = positive
                </Typography>
              </Box>
            </Box>
          </StyledCard>
        </Box>
      )}
    </PageContainer>
  );
}
