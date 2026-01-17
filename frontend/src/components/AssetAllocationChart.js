import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Paper, Typography } from "@mui/material";
import { formatCurrency } from "../utils/formatNumber";

const COLORS = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0"];

const AssetAllocationChart = ({ data, title, height }) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="type"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry) => `${entry.type}: ${entry.percentage.toFixed(1)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  </Paper>
);

export default AssetAllocationChart;
