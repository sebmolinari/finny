import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Chip,
  LinearProgress,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import ComputerIcon from "@mui/icons-material/Computer";

import {
  StyledTable,
  StyledHeaderRow,
  StyledHeaderCell,
} from "../components/StyledTable";
import { TableBody, TableCell, TableRow, TableHead } from "@mui/material";
import api from "../api/api";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

const MetricRow = ({ label, value, extra }) => (
  <TableRow
    sx={{
      "&:hover": { bgcolor: "action.hover", transition: "background 0.12s" },
    }}
  >
    <TableCell sx={{ fontWeight: 500, color: "text.secondary", width: "45%" }}>
      {label}
    </TableCell>
    <TableCell>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
      {extra}
    </TableCell>
  </TableRow>
);

const UtilBar = ({ value, max, color = "primary" }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const severity = pct > 85 ? "error" : pct > 60 ? "warning" : color;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={severity}
        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 34 }}
      >
        {pct}%
      </Typography>
    </Box>
  );
};

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/metrics/host-metrics");
        setMetrics(res.data);
        setLastRefresh(new Date().toLocaleTimeString());
      } catch {
        setError("Failed to fetch metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const memUsed = metrics
    ? Math.round((metrics.totalMem - metrics.freeMem) / 1024 / 1024)
    : 0;
  const memTotal = metrics ? Math.round(metrics.totalMem / 1024 / 1024) : 1;

  return (
    <PageContainer
      title="Host Metrics"
      subtitle="Live system performance — refreshes every 10 s"
      maxWidth="sm"
    >
      <Paper sx={{ p: 3, ...fadeInUpSx(1) }}>
        {loading && !metrics ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : metrics ? (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  icon={<ComputerIcon />}
                  label={`${metrics.platform} · ${metrics.arch}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`Uptime ${Math.floor(metrics.uptime / 60)} min`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Last update: {lastRefresh}
              </Typography>
            </Box>

            <StyledTable>
              <TableHead>
                <StyledHeaderRow>
                  <StyledHeaderCell>Metric</StyledHeaderCell>
                  <StyledHeaderCell>Value</StyledHeaderCell>
                </StyledHeaderRow>
              </TableHead>
              <TableBody>
                <MetricRow
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <MemoryIcon fontSize="small" />
                      CPU Load (1 / 5 / 15 min)
                    </Box>
                  }
                  value={metrics.cpuLoad.map((l) => l.toFixed(2)).join("  /  ")}
                />
                {metrics.cpuTemp !== null && (
                  <MetricRow
                    label="CPU Temp"
                    value={`${metrics.cpuTemp.toFixed(1)} °C`}
                    extra={
                      <UtilBar
                        value={metrics.cpuTemp}
                        max={100}
                        color="warning"
                      />
                    }
                  />
                )}
                <MetricRow
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <MemoryIcon fontSize="small" />
                      Memory Used / Total
                    </Box>
                  }
                  value={`${memUsed} MB / ${memTotal} MB`}
                  extra={<UtilBar value={memUsed} max={memTotal} />}
                />
                {metrics.disk && (
                  <MetricRow
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <StorageIcon fontSize="small" />
                        Disk (root)
                      </Box>
                    }
                    value={`${metrics.disk.used} / ${metrics.disk.size}`}
                    extra={
                      <UtilBar
                        value={parseFloat(metrics.disk.used)}
                        max={parseFloat(metrics.disk.size)}
                      />
                    }
                  />
                )}
                <MetricRow label="Hostname" value={metrics.hostname} />
              </TableBody>
            </StyledTable>
          </>
        ) : null}
      </Paper>
    </PageContainer>
  );
}
