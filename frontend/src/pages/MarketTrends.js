import React, { useState, useEffect } from "react";
import { Container, Paper, Typography, TableContainer } from "@mui/material";
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
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body1" fontWeight="bold" title={params.value}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => <span title={params.value}>{params.value}</span>,
    },
    { field: "asset_type", headerName: "Type", flex: 1 },
    { field: "currency", headerName: "Currency", flex: 1 },
    {
      field: "current_price",
      headerName: "Current Price",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "price_change_percent",
      headerName: "30D Change",
      flex: 1,
      headerAlign: "right",
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Market Trends
      </Typography>

      <TableContainer component={Paper}>
        <StyledDataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.asset_id}
          pageSize={25}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          autoHeight
        />
      </TableContainer>
    </Container>
  );
}
