import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  EventNote as EventNoteIcon,
  Restore as RestoreIcon,
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
import {
  formatCurrency,
  formatPercent,
  formatNumber,
} from "../utils/formatNumber";
import { MetricCard, StyledCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

function toDateInput(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const RANGE_OPTIONS = [
  { label: "YTD", value: "ytd", days: null },
  { label: "1Y", value: "1y", days: 365 },
  { label: "2Y", value: "2y", days: 730 },
  { label: "3Y", value: "3y", days: 1095 },
  { label: "All", value: "inception", days: null },
  { label: "Custom", value: "custom", days: null },
];

export default function RiskMetrics() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState("ytd");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(toDateInput(new Date()));

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
        const now = new Date();
        startDate = `${now.getFullYear()}-01-01`;
        endDate = toDateInput(now);
        days = 365;
      } else if (rangeMode === "inception") {
        days = 3650; // 10 years max for inception — backend will clip to first transaction
      }

      const res = await analyticsAPI.getRiskMetrics(days, startDate, endDate);
      setData(res.data);
    } catch (err) {
      console.error("Error loading risk metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [rangeMode, customStart, customEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner maxWidth="lg" />;

  const navSeries = data?.nav_series ?? [];
  const rollingVol = data?.rolling_volatility ?? [];
  const maxDD = data?.max_drawdown;
  const recoveryDays = data?.recovery_days;
  const recoveryDate = data?.recovery_date;

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
      </Grid>

      {/* NAV + Volatility chart */}
      <Grid container spacing={2}>
        <Grid size={12}>
          <Box sx={fadeInUpSx(6)}>
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
          <Box sx={fadeInUpSx(7)}>
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
    </PageContainer>
  );
}
