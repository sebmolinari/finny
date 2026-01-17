import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  Line,
  LabelList,
} from "recharts";
import { Paper, Typography } from "@mui/material";
import { formatCurrency, formatPercent } from "../utils/formatNumber";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const mtmPoint = payload.find((p) => p.dataKey === "mtm");
  const cagrPoint = payload.find((p) => p.dataKey === "cagr");

  return (
    <div style={{ background: "#fff", padding: 10, border: "1px solid #ccc" }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      {mtmPoint && (
        <div>{`MTM: ${formatCurrency(mtmPoint.value)}`}</div>
      )}
      {cagrPoint && (
        <div>{`CAGR: ${formatPercent(cagrPoint.value)}`}</div>
      )}
    </div>
  );
};

const MTMEvolutionChart = ({ data, title, height }) => {
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title || "MTM Evolution"}
      </Typography>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 48, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => formatCurrency(v, 0)}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => formatPercent(v, 0)}
            domain={[0, "dataMax + 10"]}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar dataKey="mtm" fill="#1976d2" yAxisId="left" name="MTM">
            <LabelList dataKey="mtm" position="top" offset={8} formatter={(v) => formatCurrency(v, 0)} />
          </Bar>
          <Line
            type="monotone"
            dataKey="cagr"
            stroke="#ff6b6b"
            strokeWidth={2}
            dot={{ r: 4 }}
            yAxisId="right"
            name="CAGR"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default MTMEvolutionChart;
