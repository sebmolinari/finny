import { useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { areaElementClasses } from "@mui/x-charts/LineChart";

function AreaGradient({ color, id }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

AreaGradient.propTypes = {
  color: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
};

function StatCard({
  title,
  icon,
  value,
  interval,
  intervalColor,
  trend,
  data,
  trendLabel,
  xAxisData,
  subtitle,
  valueColor,
}) {
  const theme = useTheme();

  const trendColors = {
    up:
      theme.palette.mode === "light"
        ? theme.palette.success.main
        : theme.palette.success.dark,
    down:
      theme.palette.mode === "light"
        ? theme.palette.error.main
        : theme.palette.error.dark,
    neutral:
      theme.palette.mode === "light"
        ? theme.palette.grey[400]
        : theme.palette.grey[700],
  };

  const labelColors = { up: "success", down: "error", neutral: "default" };

  const chartColor = trendColors[trend];
  const chipLabel = trendLabel ?? "";

  // Normalize to delta from baseline so small % moves fill the chart height
  const hasSparkline = Array.isArray(data) && data.length > 1;
  const baseline = hasSparkline ? data[0] : 0;
  const normalizedData = hasSparkline ? data.map((v) => v - baseline) : [];

  return (
    <Card variant="outlined" sx={{ height: "100%", flexGrow: 1 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          {icon && (
            <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
              {icon}
            </Box>
          )}
          <Typography color="text.secondary" variant="subtitle2">
            {title}
          </Typography>
        </Box>
        <Stack
          direction="column"
          sx={{ justifyContent: "space-between", flexGrow: "1", gap: 1 }}
        >
          <Stack sx={{ justifyContent: "space-between" }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography
                variant="h4"
                component="p"
                color={valueColor ?? "primary"}
                fontWeight={400}
              >
                {value}
              </Typography>
              <Chip size="small" color={labelColors[trend]} label={chipLabel} />
            </Stack>
            <Typography
              variant="caption"
              sx={{ color: intervalColor ?? "text.secondary" }}
            >
              {interval}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Stack>
          {hasSparkline && (
            <Box sx={{ width: "100%", height: 50 }}>
              <SparkLineChart
                color={chartColor}
                data={normalizedData}
                area
                showHighlight
                showTooltip
                valueFormatter={(v) => {
                  const abs = v + baseline;
                  return abs >= 1000
                    ? `$${(abs / 1000).toFixed(1)}k`
                    : `$${abs.toFixed(2)}`;
                }}
                xAxis={{
                  scaleType: "band",
                  data: xAxisData,
                }}
                sx={{
                  [`& .${areaElementClasses.root}`]: {
                    fill: `url(#area-gradient-${value})`,
                  },
                }}
              >
                <AreaGradient
                  color={chartColor}
                  id={`area-gradient-${value}`}
                />
              </SparkLineChart>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  value: PropTypes.string.isRequired,
  interval: PropTypes.string.isRequired,
  trend: PropTypes.oneOf(["up", "down", "neutral"]).isRequired,
  data: PropTypes.arrayOf(PropTypes.number),
  trendLabel: PropTypes.string,
  xAxisData: PropTypes.arrayOf(PropTypes.string),
  subtitle: PropTypes.string,
  intervalColor: PropTypes.string,
  valueColor: PropTypes.string,
};

export default StatCard;
