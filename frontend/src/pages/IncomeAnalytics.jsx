import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
} from "recharts";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { CompactCard } from "../components/data-display/StyledCard";
import ChartCard from "../components/charts/ChartCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import PageContainer from "../components/layout/PageContainer";
import { analyticsAPI } from "../api/api";
import { formatCurrency } from "../utils/formatNumber";
import { formatDate, getTodayInTimezone } from "../utils/dateUtils";
import { handleApiError } from "../utils/errorHandler";
import { fadeInUpSx } from "../utils/animations";
import { useUserSettings } from "../hooks/useUserSettings";

const INCOME_TYPES = ["dividend", "interest", "coupon", "rental"];

function getTypeColor(type) {
  switch (type) {
    case "dividend":
      return "primary";
    case "interest":
      return "secondary";
    case "coupon":
      return "info";
    case "rental":
      return "warning";
    default:
      return "default";
  }
}

function typeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function IncomeAnalytics() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { timezone, dateFormat, settingsLoading } = useUserSettings();

  const [report, setReport] = useState(null);
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [error, setError] = useState(null);

  const loadIncome = useCallback(async () => {
    setIncomeLoading(true);
    try {
      let year = null,
        startDate = null,
        endDate = null;
      if (typeof selectedYear === "number") {
        year = selectedYear;
      } else if (
        typeof selectedYear === "string" &&
        selectedYear.startsWith("last")
      ) {
        const today = getTodayInTimezone(timezone);
        endDate = today;
        const yrs =
          selectedYear === "last1y" ? 1 : selectedYear === "last3y" ? 3 : 5;
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - yrs);
        startDate = s.toISOString().split("T")[0];
      }
      const res = await analyticsAPI.getIncome(year, startDate, endDate);
      setReport(res.data);
    } catch (err) {
      handleApiError(err, "Failed to load income data", setError);
      setReport(null);
    } finally {
      setIncomeLoading(false);
    }
  }, [selectedYear, timezone]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  if (incomeLoading || settingsLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <PageContainer>
        <Typography color="error">{error}</Typography>
      </PageContainer>
    );
  }

  const {
    summary,
    by_month,
    by_year,
    by_asset,
    transactions,
    available_years,
  } = report || {};

  // Chart style helpers
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = theme.palette.text.secondary;
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const COLORS = {
    dividend: theme.palette.primary.main,
    interest: theme.palette.secondary.main,
    coupon: theme.palette.info.main,
    rental: theme.palette.warning.main,
  };

  // ── Custom tooltip for income charts ───────────────────────────────────────
  const IncomeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <div
        style={{
          background: tooltipBg,
          border: `1px solid ${tooltipBorder}`,
          borderRadius: 10,
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          padding: "10px 14px",
          fontSize: 12,
          fontFamily: "inherit",
          minWidth: 160,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            color: theme.palette.text.primary,
          }}
        >
          {label}
        </div>
        {payload.map((p) =>
          p.value > 0 ? (
            <div
              key={p.dataKey}
              style={{ color: COLORS[p.dataKey], marginBottom: 2 }}
            >
              {typeLabel(p.dataKey)}:{" "}
              <strong>{formatCurrency(p.value, 0)}</strong>
            </div>
          ) : null,
        )}
        <div
          style={{
            borderTop: `1px solid ${tooltipBorder}`,
            marginTop: 6,
            paddingTop: 6,
            color: theme.palette.text.primary,
          }}
        >
          Total: <strong>{formatCurrency(total, 0)}</strong>
        </div>
      </div>
    );
  };

  // ── Stacked bar chart component (reused for monthly and annual) ────────────
  const IncomeBarChart = ({ data, xKey, height = 320, animIndex }) => (
    <ChartCard height={height} animIndex={animIndex}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, 0)}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <RechartsTooltip content={<IncomeTooltip />} />
          {INCOME_TYPES.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="income"
              fill={COLORS[type]}
              maxBarSize={56}
              radius={type === "rental" ? [6, 6, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const hasIncome = summary && summary.total_income > 0;

  // ── Asset table columns ────────────────────────────────────────────────────
  const assetColumns = [
    {
      field: "symbol",
      headerName: "Symbol",
      headerAlign: "center",
      width: 90,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "asset_name",
      headerName: "Name",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 100,
    },
    {
      field: "dividend",
      headerName: "Dividends",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value > 0 ? (
          <span style={{ color: COLORS.dividend }}>
            {formatCurrency(params.value, 0)}
          </span>
        ) : (
          <span style={{ color: theme.palette.text.disabled }}>—</span>
        ),
    },
    {
      field: "interest",
      headerName: "Interest",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value > 0 ? (
          <span style={{ color: COLORS.interest }}>
            {formatCurrency(params.value, 0)}
          </span>
        ) : (
          <span style={{ color: theme.palette.text.disabled }}>—</span>
        ),
    },
    {
      field: "coupon",
      headerName: "Coupons",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value > 0 ? (
          <span style={{ color: COLORS.coupon }}>
            {formatCurrency(params.value, 0)}
          </span>
        ) : (
          <span style={{ color: theme.palette.text.disabled }}>—</span>
        ),
    },
    {
      field: "rental",
      headerName: "Rental",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.value > 0 ? (
          <span style={{ color: COLORS.rental }}>
            {formatCurrency(params.value, 0)}
          </span>
        ) : (
          <span style={{ color: theme.palette.text.disabled }}>—</span>
        ),
    },
    {
      field: "total",
      headerName: "Total",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700}>
          {formatCurrency(params.value, 0)}
        </Typography>
      ),
    },
    {
      field: "transaction_count",
      headerName: "# Events",
      headerAlign: "center",
      align: "right",
      width: 80,
    },
    {
      field: "last_date",
      headerName: "Last Income",
      headerAlign: "center",
      width: 110,
      renderCell: (params) =>
        params.value ? formatDate(params.value, dateFormat) : "—",
    },
  ];

  // ── Transaction detail columns ─────────────────────────────────────────────
  const txColumns = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      width: 100,
      renderCell: (params) => formatDate(params.value, dateFormat),
    },
    {
      field: "transaction_type",
      headerName: "Type",
      headerAlign: "center",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={typeLabel(params.value)}
          color={getTypeColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "symbol",
      headerName: "Asset",
      headerAlign: "center",
      width: 100,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "amount",
      headerName: "Amount",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span style={{ color: theme.palette.success.main }}>
          +{formatCurrency(params.value)}
        </span>
      ),
    },
    {
      field: "notes",
      headerName: "Notes",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => params.value || "—",
    },
  ];

  return (
    <PageContainer>
      {/* ── Empty state ── */}
      {!hasIncome && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <MonetizationOnIcon
            sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No income recorded
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Add dividend, interest, coupon, or rental transactions in the
            Blotter to see income analytics here.
          </Typography>
        </Paper>
      )}

      {hasIncome && (
        <>
          {/* ── Summary cards ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} sx={fadeInUpSx(1)}>
              <CompactCard
                title="Total Income"
                value={formatCurrency(summary.total_income, 0)}
                valueColor={theme.palette.success.main}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} sx={fadeInUpSx(2)}>
              <CompactCard
                title="Dividends"
                value={formatCurrency(summary.total_dividends, 0)}
                valueColor={COLORS.dividend}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} sx={fadeInUpSx(3)}>
              <CompactCard
                title="Interest & Coupons"
                value={formatCurrency(
                  summary.total_interest + summary.total_coupons,
                  0,
                )}
                valueColor={COLORS.interest}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} sx={fadeInUpSx(4)}>
              <CompactCard
                title="Rental"
                value={formatCurrency(summary.total_rentals, 0)}
                valueColor={COLORS.rental}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} sx={fadeInUpSx(5)}>
              <Tooltip
                title={
                  summary.projected_annual !== null
                    ? summary.projected_ttm_months < 12
                      ? `Extrapolated from ${summary.projected_ttm_months} month${summary.projected_ttm_months !== 1 ? "s" : ""} of data in the past 12 months (avg/month × 12)`
                      : "Sum of the last 12 months of income"
                    : "Not available in all-years view"
                }
                arrow
              >
                <Box>
                  <CompactCard
                    title="Projected Annual"
                    value={
                      summary.projected_annual !== null
                        ? formatCurrency(summary.projected_annual, 0)
                        : "—"
                    }
                    valueColor={
                      summary.projected_annual !== null
                        ? theme.palette.primary.main
                        : theme.palette.text.disabled
                    }
                  />
                </Box>
              </Tooltip>
            </Grid>
          </Grid>

          {/* ── Monthly chart ── */}
          {by_month.length > 0 && (
            <Box sx={{ mb: 3, ...fadeInUpSx(6) }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ flexGrow: 1 }}
                >
                  Monthly Income
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    displayEmpty
                    value={selectedYear === null ? "" : selectedYear}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") setSelectedYear(null);
                      else if (typeof v === "string" && v.startsWith("last"))
                        setSelectedYear(v);
                      else setSelectedYear(Number(v));
                    }}
                    renderValue={(v) => {
                      if (v === "") return "All Years";
                      if (v === "last1y") return "Last 1 Year";
                      if (v === "last3y") return "Last 3 Years";
                      if (v === "last5y") return "Last 5 Years";
                      return v;
                    }}
                  >
                    <MenuItem value="">All Years</MenuItem>
                    <MenuItem value="last1y">Last 1 Year</MenuItem>
                    <MenuItem value="last3y">Last 3 Years</MenuItem>
                    <MenuItem value="last5y">Last 5 Years</MenuItem>
                    {(available_years || []).map((yr) => (
                      <MenuItem key={yr} value={Number(yr)}>
                        {yr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <IncomeBarChart
                data={by_month}
                xKey="month_label"
                height={320}
                animIndex={6}
              />
            </Box>
          )}

          {/* ── Annual chart (all-time view only) ── */}
          {selectedYear === null && by_year && by_year.length > 1 && (
            <Box sx={{ mb: 3, ...fadeInUpSx(7) }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Annual Income
              </Typography>
              <IncomeBarChart
                data={by_year}
                xKey="year"
                height={280}
                animIndex={7}
              />
            </Box>
          )}

          {/* ── Income by asset ── */}
          {by_asset.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, ...fadeInUpSx(8) }}>
              <StyledDataGrid
                label="Income by Asset"
                rows={by_asset}
                columns={assetColumns}
                getRowId={(row) => row.asset_id ?? row.symbol}
                pageSize={25}
                rowsPerPageOptions={[25, 50]}
              />
            </Paper>
          )}

          {/* ── Transaction detail ── */}
          {transactions.length > 0 && (
            <Paper sx={{ p: 2, ...fadeInUpSx(9) }}>
              <Typography variant="h6" gutterBottom>
                Income Transactions
              </Typography>
              <StyledDataGrid
                label="Income Transactions"
                rows={transactions}
                columns={txColumns}
                getRowId={(row) => row.id}
                pageSize={50}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </Paper>
          )}
        </>
      )}
    </PageContainer>
  );
}
