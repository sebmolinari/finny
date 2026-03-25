import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import ChartCard from "./ChartCard";
import { formatCurrency } from "../../utils/formatNumber";

const BAR_PALETTE = [
  "#2563eb",
  "#9333ea",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

const MarketValueByBrokerChart = ({
  data,
  title,
  subtitle,
  height = 300,
  animIndex = 3,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = theme.palette.text.secondary;
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={height}
      animIndex={animIndex}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 48 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12, fill: tickColor, textAnchor: "end" }}
            axisLine={false}
            tickLine={false}
            angle={-45}
            dx={-4}
          />
          <YAxis
            domain={[0, "dataMax"]}
            tickFormatter={(v) => formatCurrency(v, 0)}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <RechartsTooltip
            formatter={(v) => [formatCurrency(v), "Market Value"]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 10,
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
            itemStyle={{ color: BAR_PALETTE[0] }}
            cursor={{
              fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default MarketValueByBrokerChart;
