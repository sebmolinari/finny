import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Chip,
  Alert,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { analyticsAPI } from "../api/api";
import { getTodayInTimezone } from "../utils/dateUtils";
import { formatCurrency, formatNumber } from "../utils/formatNumber";
import { MetricCard, StyledCard } from "../components/StyledCard";
import StyledDataGrid from "../components/StyledDataGrid";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import { useUserSettings } from "../hooks/useUserSettings";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";

const RANGE_OPTIONS = [
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
  { label: "All", value: "inception" },
  { label: "Custom", value: "custom" },
];

const columns = [
  { field: "symbol", headerName: "Asset", width: 100 },
  { field: "name", headerName: "Name", flex: 1, minWidth: 130 },
  {
    field: "asset_type",
    headerName: "Type",
    headerAlign: "center",
    width: 130,
    renderCell: (params) => {
      const t = params.value || "";
      const colorMap = {
        currency: ["#e3f2fd", "#1976d2"],
        equity: ["#f3e5f5", "#9c27b0"],
        crypto: ["#fff3e0", "#ff9800"],
        fixedincome: ["#e0f2f1", "#00796b"],
        realestate: ["#fce4ec", "#c2185b"],
      };
      const [bg, fg] = colorMap[t] || ["#f5f5f5", "#757575"];
      const label =
        t === "equity"
          ? "Equity"
          : t === "crypto"
            ? "Crypto"
            : t === "currency"
              ? "Currency"
              : t === "fixedincome"
                ? "Fixed Income"
                : t === "realestate"
                  ? "Real Estate"
                  : t;
      return (
        <Chip
          label={label}
          size="small"
          sx={{
            backgroundColor: bg,
            color: fg,
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        />
      );
    },
  },
  {
    field: "beginning_value",
    headerName: "Start Value",
    width: 130,
    type: "number",
    valueFormatter: (value) => formatCurrency(value, 0),
  },
  {
    field: "ending_value",
    headerName: "End Value",
    width: 130,
    type: "number",
    valueFormatter: (value) => formatCurrency(value, 0),
  },
  {
    field: "net_flows",
    headerName: "Net Flows",
    width: 120,
    type: "number",
    valueFormatter: (value) => formatCurrency(value, 0),
  },
  {
    field: "price_gain",
    headerName: "Total Gain",
    description:
      "End Value − Start Value − Net Flows. Includes both unrealized P&L on current holdings AND realized P&L from any positions sold during the period. This will differ from Holdings unrealized P&L when positions were partially or fully sold.",
    width: 130,
    type: "number",
    renderCell: (params) => (
      <Typography
        variant="body2"
        color={params.value >= 0 ? "success.main" : "error.main"}
        fontWeight={600}
      >
        {formatCurrency(params.value, 0)}
      </Typography>
    ),
  },
  {
    field: "contribution_pct",
    headerName: "Contribution",
    description:
      "Total Gain as a percentage of the portfolio's beginning NAV. Shows how much this asset added to (or subtracted from) the overall portfolio return, scaled by its weight.",
    width: 130,
    type: "number",
    renderCell: (params) => (
      <Typography
        variant="body2"
        color={params.value >= 0 ? "success.main" : "error.main"}
        fontWeight={600}
      >
        {params.value >= 0 ? "+" : ""}
        {formatNumber(params.value, 2)}%
      </Typography>
    ),
  },
];

export default function PerformanceAttribution() {
  const theme = useTheme();
  const { timezone: userTimezone } = useUserSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rangeMode, setRangeMode] = useState("ytd");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(() => getTodayInTimezone("UTC"));
  const [inceptionDate, setInceptionDate] = useState(null);

  useEffect(() => {
    setCustomEnd(getTodayInTimezone(userTimezone || "UTC"));
  }, [userTimezone]);

  useEffect(() => {
    analyticsAPI
      .getInceptionDate()
      .then((res) => setInceptionDate(res.data?.inception_date || null))
      .catch(() => {});
  }, []);

  const getDateRange = useCallback(() => {
    const today = getTodayInTimezone(userTimezone);
    switch (rangeMode) {
      case "ytd":
        return { startDate: `${today.substring(0, 4)}-01-01`, endDate: today };
      case "1y": {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 1);
        return { startDate: s.toISOString().split("T")[0], endDate: today };
      }
      case "2y": {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 2);
        return { startDate: s.toISOString().split("T")[0], endDate: today };
      }
      case "3y": {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 3);
        return { startDate: s.toISOString().split("T")[0], endDate: today };
      }
      case "5y": {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 5);
        return { startDate: s.toISOString().split("T")[0], endDate: today };
      }
      case "inception":
        return inceptionDate
          ? { startDate: inceptionDate, endDate: today }
          : null;
      case "custom":
        return customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : null;
      default:
        return null;
    }
  }, [rangeMode, customStart, customEnd, inceptionDate, userTimezone]);

  const loadData = useCallback(async () => {
    const range = getDateRange();
    if (!range) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getAttribution(
        range.startDate,
        range.endDate,
      );
      setData(res.data);
    } catch (err) {
      console.error("Error loading attribution:", err);
      setError("Failed to load attribution data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner maxWidth="lg" />;

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={loadData}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  const attributions = data?.attributions ?? [];
  const totalGain = attributions.reduce((s, a) => s + (a.price_gain ?? 0), 0);
  const topContributors = attributions.filter((a) => a.contribution_pct > 0);
  const bottomContributors = [...attributions]
    .filter((a) => a.contribution_pct < 0)
    .reverse();

  // Chart data: top 10 by absolute contribution
  const chartData = [...attributions]
    .sort((a, b) => Math.abs(b.contribution_pct) - Math.abs(a.contribution_pct))
    .slice(0, 15)
    .sort((a, b) => b.contribution_pct - a.contribution_pct);

  const rows = attributions.map((a, i) => ({ id: i, ...a }));

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
            <ToggleButton
              key={o.value}
              value={o.value}
              disabled={o.value === "inception" && !inceptionDate}
            >
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
        {data && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            Period: {data.start_date} → {data.end_date}
          </Typography>
        )}
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={fadeInUpSx(2)}>
            <MetricCard
              title="Beginning NAV"
              value={formatCurrency(data?.beginning_nav ?? 0, 0)}
              icon={<TrendingUpIcon color="primary" fontSize="small" />}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={fadeInUpSx(3)}>
            <MetricCard
              title="Total Price Gain"
              value={formatCurrency(totalGain, 0)}
              valueColor={
                totalGain >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }
              icon={
                totalGain >= 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )
              }
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={fadeInUpSx(4)}>
            <MetricCard
              title="Top Contributors"
              value={String(topContributors.length)}
              valueColor={theme.palette.success.main}
              icon={<TrendingUpIcon color="success" fontSize="small" />}
              subtitle={
                topContributors[0] ? (
                  <Typography variant="caption" color="text.secondary">
                    Best: {topContributors[0].symbol} (+
                    {formatNumber(topContributors[0].contribution_pct, 2)}%)
                  </Typography>
                ) : null
              }
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={fadeInUpSx(5)}>
            <MetricCard
              title="Detractors"
              value={String(bottomContributors.length)}
              valueColor={
                bottomContributors.length > 0
                  ? theme.palette.error.main
                  : undefined
              }
              icon={<TrendingDownIcon color="error" fontSize="small" />}
              subtitle={
                bottomContributors[0] ? (
                  <Typography variant="caption" color="text.secondary">
                    Worst: {bottomContributors[0].symbol} (
                    {formatNumber(bottomContributors[0].contribution_pct, 2)}%)
                  </Typography>
                ) : null
              }
            />
          </Box>
        </Grid>
      </Grid>

      {/* Horizontal bar chart */}
      <Box sx={{ mb: 3, ...fadeInUpSx(6) }}>
        <StyledCard>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Contribution to Return (%) — Top 15 Positions
            </Typography>
          </Box>
          <Box sx={{ p: 2, height: Math.max(300, chartData.length * 36 + 60) }}>
            {chartData.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No attribution data available for this period.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 60, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={theme.palette.divider}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      `${v >= 0 ? "+" : ""}${formatNumber(v, 1)}%`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    tick={{ fontSize: 12 }}
                    width={55}
                  />
                  <ReferenceLine
                    x={0}
                    stroke={theme.palette.divider}
                    strokeWidth={1.5}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name, props) => [
                      `${value >= 0 ? "+" : ""}${formatNumber(value, 2)}% (${formatCurrency(props.payload.price_gain, 0)})`,
                      "Contribution",
                    ]}
                    labelFormatter={(l) => l}
                  />
                  <Bar dataKey="contribution_pct" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.contribution_pct >= 0
                            ? theme.palette.success.main
                            : theme.palette.error.main
                        }
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </StyledCard>
      </Box>

      {/* Detail table */}
      <Box sx={fadeInUpSx(7)}>
        <StyledCard>
          <Box sx={{ height: 400 }}>
            <StyledDataGrid
              label="Attribution Detail"
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              hideFooter={rows.length <= 25}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
            />
          </Box>
        </StyledCard>
      </Box>
    </PageContainer>
  );
}
