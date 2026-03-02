import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import ChartCard from "./ChartCard";
import { formatCurrency } from "../utils/formatNumber";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

const renderSliceLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}) => {
  if (percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: 11,
        fontWeight: 600,
        fill: "#fff",
        pointerEvents: "none",
      }}
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

const AssetAllocationChart = ({
  data,
  title,
  subtitle,
  height = 300,
  animIndex = 2,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height / 2 - 30, 110)}
            innerRadius={Math.min(height / 2 - 30, 110) * 0.52}
            paddingAngle={2}
            strokeWidth={0}
            label={renderSliceLabel}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(v, name, props) => [
              `${formatCurrency(v)}  (${props.payload?.percentage?.toFixed(1)}%)`,
              props.payload?.type,
            ]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 10,
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => (
              <span
                style={{ fontSize: 12, color: theme.palette.text.secondary }}
              >
                {v}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default AssetAllocationChart;
