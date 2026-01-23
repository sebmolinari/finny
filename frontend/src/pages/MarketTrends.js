import React, { useState, useEffect } from "react";
import { Container, Paper, Typography, Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import StyledDataGrid from "../components/StyledDataGrid";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MarketTrends() {
  const [trends30D, setTrends30D] = useState([]);
  const [trendsYTD, setTrendsYTD] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  useEffect(() => {
    loadMarketTrends();
  }, []);

  const loadMarketTrends = async () => {
    try {
      // Calculate YTD days
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const ytdDays = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24));

      // Load both 30D and YTD data in parallel
      const [response30D, responseYTD] = await Promise.all([
        analyticsAPI.getMarketTrends(30),
        analyticsAPI.getMarketTrends(ytdDays),
      ]);

      setTrends30D(response30D.data.trends);
      setTrendsYTD(responseYTD.data.trends);
    } catch (error) {
      console.error("Error loading market trends:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  // Merge 30D and YTD data by asset_id
  const assetMap = new Map();

  // Add 30D data
  trends30D.forEach((trend) => {
    assetMap.set(trend.asset_id, {
      ...trend,
      price_change_percent_30d: trend.price_change_percent,
      price_history_30d: trend.price_history,
    });
  });

  // Add YTD data
  trendsYTD.forEach((trend) => {
    const existing = assetMap.get(trend.asset_id);
    if (existing) {
      assetMap.set(trend.asset_id, {
        ...existing,
        price_change_percent_ytd: trend.price_change_percent,
        price_history_ytd: trend.price_history,
      });
    } else {
      assetMap.set(trend.asset_id, {
        ...trend,
        price_change_percent_ytd: trend.price_change_percent,
        price_history_ytd: trend.price_history,
        price_change_percent_30d: 0,
        price_history_30d: [],
      });
    }
  });

  const rows = Array.from(assetMap.values());

  const columns = [
    {
      field: "symbol",
      headerName: "Symbol",
      headerAlign: "center",
      width: 15,
    },
    {
      field: "name",
      headerName: "Name",
      headerAlign: "center",
      width: 250,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 150,
      renderCell: (params) => {
        const asset_type = params.value || "";
        const bg =
          asset_type === "currency"
            ? "#e3f2fd"
            : asset_type === "equity"
              ? "#f3e5f5"
              : asset_type === "crypto"
                ? "#fff3e0"
                : asset_type === "fixedincome"
                  ? "#e0f2f1"
                  : asset_type === "realestate"
                    ? "#fce4ec"
                    : "#f5f5f5";
        const color =
          asset_type === "currency"
            ? "#1976d2"
            : asset_type === "equity"
              ? "#9c27b0"
              : asset_type === "crypto"
                ? "#ff9800"
                : asset_type === "fixedincome"
                  ? "#00796b"
                  : asset_type === "realestate"
                    ? "#c2185b"
                    : "#757575";
        return (
          <Chip
            label={asset_type.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: bg,
              color: color,
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        );
      },
    },
    {
      field: "currency",
      headerName: "Currency",
      headerAlign: "center",
      width: 150,
    },
    {
      field: "current_price",
      headerName: "Current Price",
      flex: 1,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "price_change_percent_30d",
      headerName: "30D Change",
      flex: 1,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => {
        const val = params.value || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return (
          <span style={{ color, fontWeight: 700 }}>{formatPercent(val)}</span>
        );
      },
    },
    {
      field: "trend_30d",
      headerName: "30D Trend",
      flex: 1,
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const history = params.row.price_history_30d || [];
        const chartData = history.map((p) => ({ price: p.price }));
        const val = params.row.price_change_percent_30d || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        if (chartData.length > 1) {
          const prices = chartData.map((d) => d.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const domain =
            min === max
              ? [min * 0.99, max * 1.01]
              : [min - (max - min) * 0.1, max + (max - min) * 0.1];
          return (
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <YAxis hide domain={domain} />
              </LineChart>
            </ResponsiveContainer>
          );
        }
        return (
          <Typography variant="caption" color="text.secondary">
            No data
          </Typography>
        );
      },
    },
    {
      field: "price_change_percent_ytd",
      headerName: "YTD Change",
      flex: 1,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => {
        const val = params.value || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return (
          <span style={{ color, fontWeight: 700 }}>{formatPercent(val)}</span>
        );
      },
    },
    {
      field: "trend_ytd",
      headerName: "YTD Trend",
      flex: 1,
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const history = params.row.price_history_ytd || [];
        const chartData = history.map((p) => ({ price: p.price }));
        const val = params.row.price_change_percent_ytd || 0;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        if (chartData.length > 1) {
          const prices = chartData.map((d) => d.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const domain =
            min === max
              ? [min * 0.99, max * 1.01]
              : [min - (max - min) * 0.1, max + (max - min) * 0.1];
          return (
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <YAxis hide domain={domain} />
              </LineChart>
            </ResponsiveContainer>
          );
        }
        return (
          <Typography variant="caption" color="text.secondary">
            No data
          </Typography>
        );
      },
    },
  ];

  return (
    <Container maxWidth="ml" sx={{ mt: 4, mb: 4 }}>
      <Paper>
        <StyledDataGrid
          label="Market Trends"
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(r) => r.asset_id}
        />
      </Paper>
    </Container>
  );
}
