import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Paper, Typography } from "@mui/material";
import { formatCurrency } from "../utils/formatNumber";

const MarketValueByBrokerChart = ({ data, title, height }) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          interval={0}
          tick={{ fontSize: 14 }}
          allowDataOverflow={false}
        />
        <YAxis
          domain={[0, "dataMax"]}
          tickFormatter={(value) => formatCurrency(value, 0)}
        />
        <RechartsTooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <Bar dataKey="value" fill="#2196f3" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Paper>
);

export default MarketValueByBrokerChart;
