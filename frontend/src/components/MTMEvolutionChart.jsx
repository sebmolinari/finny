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
  Cell,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import ChartCard from "./ChartCard";
import { formatCurrency, formatPercent } from "../utils/formatNumber";

const MTMEvolutionChart = ({ data, title, height = 380, animIndex = 4 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = theme.palette.text.secondary;
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const barColor = theme.palette.primary.main;
  const lineColor = theme.palette.warning.main;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const mtm = payload.find((p) => p.dataKey === "mtm");
    const cagr = payload.find((p) => p.dataKey === "cagr");
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
        {mtm && (
          <div style={{ color: barColor }}>
            MTM: <strong>{formatCurrency(mtm.value)}</strong>
          </div>
        )}
        {cagr && cagr.value != null && (
          <div style={{ color: lineColor }}>
            CAGR: <strong>{formatPercent(cagr.value)}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <ChartCard title={title} height={height} animIndex={animIndex}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 32, right: 40, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => formatCurrency(v, 0)}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => formatPercent(v, 0)}
            domain={[0, "dataMax + 10"]}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar
            dataKey="mtm"
            yAxisId="left"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.mtm >= 0 ? barColor : theme.palette.error.main}
              />
            ))}
            <LabelList
              dataKey="mtm"
              position="top"
              offset={6}
              formatter={(v) => formatCurrency(v, 0)}
              style={{ fontSize: 10, fill: tickColor }}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="cagr"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: tooltipBg, stroke: lineColor }}
            activeDot={{ r: 6 }}
            yAxisId="right"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default MTMEvolutionChart;
