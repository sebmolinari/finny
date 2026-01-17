import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import {
  StyledTable,
  StyledHeaderCell,
  TruncatedCell,
} from "../components/StyledTable";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MarketTrends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Market Trends
      </Typography>

      <TableContainer component={Paper}>
        <StyledTable>
          <TableHead>
            <TableRow>
              <StyledHeaderCell sx={{ width: 100 }}>Symbol</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 200 }}>Name</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 80 }}>Type</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 80 }}>Currency</StyledHeaderCell>
              <StyledHeaderCell align="right" sx={{ width: 120 }}>
                Current Price
              </StyledHeaderCell>
              <StyledHeaderCell align="right" sx={{ width: 100 }}>
                30D Change
              </StyledHeaderCell>
              <StyledHeaderCell align="center" sx={{ width: 150 }}>
                30D Trend
              </StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trends.map((trend) => {
              const chartData = trend.price_history.map((p) => ({
                price: p.price,
              }));
              const priceChangeColor =
                trend.price_change_percent >= 0 ? "#4caf50" : "#f44336";

              return (
                <TableRow key={trend.asset_id} hover>
                  <TruncatedCell maxWidth={100} title={trend.symbol}>
                    <Typography variant="body1" fontWeight="bold">
                      {trend.symbol}
                    </Typography>
                  </TruncatedCell>
                  <TruncatedCell maxWidth={200} title={trend.name}>
                    {trend.name}
                  </TruncatedCell>
                  <TableCell>{trend.asset_type}</TableCell>
                  <TableCell>{trend.currency}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(trend.current_price)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: priceChangeColor, fontWeight: "bold" }}
                  >
                    {formatPercent(trend.price_change_percent)}
                  </TableCell>
                  <TableCell align="center">
                    {chartData.length > 1 ? (
                      <ResponsiveContainer width={120} height={40}>
                        <LineChart data={chartData}>
                          {/* Dynamic y-axis domain for more visible changes */}
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke={priceChangeColor}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <YAxis
                            hide
                            domain={(() => {
                              const prices = chartData.map((d) => d.price);
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              if (min === max) return [min * 0.99, max * 1.01];
                              const buffer = (max - min) * 0.1 || 1;
                              return [min - buffer, max + buffer];
                            })()}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No data
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </StyledTable>
      </TableContainer>
    </Container>
  );
}
