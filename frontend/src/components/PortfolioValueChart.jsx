import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Line,
} from "recharts";
import { Paper, Typography } from "@mui/material";
import { formatCurrency } from "../utils/formatNumber";

const PortfolioValueChart = ({ data, title, height }) => {
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              });
            }}
            tick={{ angle: -30, fontSize: 12, dy: 10 }}
          />
          <YAxis
            domain={(() => {
              if (!data.length) return [0, "auto"];
              const values = data.map((d) => d.value);
              const min = Math.floor(Math.min(...values) / 1000) * 1000;
              const max = Math.ceil(Math.max(...values) / 1000) * 1000;
              const buffer = Math.max((max - min) * 0.05, 100);
              return [min - buffer, max + buffer];
            })()}
            tickFormatter={(value) => formatCurrency(value, 0)}
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            ticks={(() => {
              if (!data.length) return undefined;
              const values = data.map((d) => d.value);
              const min = Math.floor(Math.min(...values) / 1000) * 1000;
              const max = Math.ceil(Math.max(...values) / 1000) * 1000;
              const buffer = Math.max((max - min) * 0.05, 100);
              const start = min - buffer;
              const end = max + buffer;
              const step = Math.max(
                Math.round((end - start) / 5 / 1000) * 1000,
                1000
              );
              let ticks = [];
              for (let t = start; t <= end; t += step) {
                ticks.push(Math.round(t));
              }
              return ticks;
            })()}
          />
          <RechartsTooltip
            formatter={(value) => formatCurrency(value)}
            labelStyle={{ color: "#000" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1976d2"
            strokeWidth={2}
            dot={false}
            name="Portfolio Value"
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PortfolioValueChart;
