import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BENCHMARKS } from "../../../constants/benchmarks";
import { formatCurrency } from "../../../utils/formatNumber";

export function DateRangeControls({
  rangeMode,
  setRangeMode,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  inceptionDate,
  benchmarkSymbol,
  setBenchmarkSymbol,
  rangeMetrics,
  rangeMetricsLoading,
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
      }}
    >
      <ToggleButtonGroup
        value={rangeMode}
        exclusive
        onChange={(_, v) => v && setRangeMode(v)}
        size="small"
      >
        <ToggleButton value="ytd">YTD</ToggleButton>
        <ToggleButton value="30d">1M</ToggleButton>
        <ToggleButton value="3m">3M</ToggleButton>
        <ToggleButton value="6m">6M</ToggleButton>
        <ToggleButton value="12m">1Y</ToggleButton>
        <ToggleButton value="3y">3Y</ToggleButton>
        <ToggleButton value="5y">5Y</ToggleButton>
        <ToggleButton value="inception" disabled={!inceptionDate}>
          All
        </ToggleButton>
        <ToggleButton value="custom">Custom</ToggleButton>
      </ToggleButtonGroup>

      {rangeMode === "custom" && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            type="date"
            label="Start"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            type="date"
            label="End"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
        </Box>
      )}

      <FormControl size="small" sx={{ width: 200 }}>
        <InputLabel>Benchmark</InputLabel>
        <Select
          value={benchmarkSymbol}
          label="Benchmark"
          onChange={(e) => setBenchmarkSymbol(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {BENCHMARKS.map((b) => (
            <MenuItem key={b.symbol} value={b.symbol}>
              {b.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {rangeMetricsLoading ? (
        <CircularProgress size={18} sx={{ ml: "auto" }} />
      ) : rangeMetrics ? (
        <Box sx={{ display: "flex", gap: 2.5, ml: "auto" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              NAV Change
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={
                rangeMetrics.nav_change_pct >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }
            >
              {rangeMetrics.nav_change_pct >= 0 ? "+" : ""}
              {rangeMetrics.nav_change_pct.toFixed(2)}%{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                ({formatCurrency(rangeMetrics.nav_change, 0)})
              </Typography>
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Period MWRR
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={
                rangeMetrics.mwrr >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }
            >
              {rangeMetrics.mwrr >= 0 ? "+" : ""}
              {rangeMetrics.mwrr.toFixed(2)}%
            </Typography>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
