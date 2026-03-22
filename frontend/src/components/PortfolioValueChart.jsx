import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import ChartCard from "./ChartCard";
import { formatCurrency } from "../utils/formatNumber";

const PortfolioValueChart = ({
  data,
  title,
  controls,
  height = 300,
  animIndex = 1,
  benchmarkData = null,
  benchmarkLabel = "Benchmark",
  normalized = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const stroke = theme.palette.primary.main;
  const benchmarkStroke = theme.palette.warning.main;
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = theme.palette.text.secondary;
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // Merge portfolio data with benchmark by date when benchmark is provided
  const chartData = useMemo(() => {
    if (!benchmarkData || benchmarkData.length === 0) return data;
    const benchMap = Object.fromEntries(benchmarkData.map((b) => [b.date, b.value]));
    return data.map((d) => ({ ...d, benchmark: benchMap[d.date] ?? null }));
  }, [data, benchmarkData]);

  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, "auto"];
    const vals = chartData.flatMap((d) => {
      const v = [d.value];
      if (d.benchmark != null) v.push(d.benchmark);
      return v;
    });
    if (normalized) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const buf = (max - min) * 0.07;
      return [min - buf, max + buf];
    }
    const min = Math.floor(Math.min(...vals) / 1000) * 1000;
    const max = Math.ceil(Math.max(...vals) / 1000) * 1000;
    const buf = Math.max((max - min) * 0.07, 100);
    return [min - buf, max + buf];
  }, [chartData, normalized]);

  const hasBenchmark = benchmarkData && benchmarkData.length > 0;

  return (
    <ChartCard title={title} controls={controls} height={height} animIndex={animIndex}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={stroke}
                stopOpacity={isDark ? 0.35 : 0.18}
              />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              })
            }
            tick={{ angle: -25, fontSize: 11, fill: tickColor, dy: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v) => normalized ? `${(v - 100).toFixed(1)}%` : formatCurrency(v, 0)}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={normalized ? 56 : 80}
          />
          <RechartsTooltip
            formatter={(v, name) => [
              normalized ? `${(v - 100).toFixed(2)}%` : formatCurrency(v),
              name === "benchmark" ? benchmarkLabel : "Portfolio",
            ]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 10,
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
            labelStyle={{ color: tickColor, fontWeight: 600, marginBottom: 4 }}
            cursor={{ stroke: stroke, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          {hasBenchmark && <Legend />}
          <Area
            type="monotone"
            dataKey="value"
            name="Portfolio"
            stroke={stroke}
            strokeWidth={2.5}
            fill="url(#pvGrad)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: tooltipBg, stroke: stroke }}
          />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              name="benchmark"
              stroke={benchmarkStroke}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default PortfolioValueChart;
