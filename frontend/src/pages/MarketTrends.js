import React, { useState, useEffect } from "react";
import { Container, Paper, Typography, Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import StyledDataGrid from "../components/StyledDataGrid";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MarketTrends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  useEffect(() => {
    loadMarketTrends();
  }, []);

  const loadMarketTrends = async () => {
    try {
      const response = await analyticsAPI.getMarketTrends(30);
      setTrends(response.data.trends);
    } catch (error) {
      console.error("Error loading market trends:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }
  const rows = trends.map((t) => ({ ...t }));

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
      field: "price_change_percent",
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
      field: "trend",
      headerName: "30D Trend",
      flex: 1,
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const history = params.row.price_history || [];
        const chartData = history.map((p) => ({ price: p.price }));
        const val = params.row.price_change_percent || 0;
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
