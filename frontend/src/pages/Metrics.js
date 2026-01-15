import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";

import api from "../api/api";

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
        setLastRefresh(
          new Date().toLocaleDateString() +
            " " +
            new Date().toLocaleTimeString()
        );
      } catch (e) {
        setError("Failed to fetch metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Host System Metrics
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : metrics ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Last refresh: {lastRefresh}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>CPU Load (1/5/15 min)</TableCell>
                  <TableCell>
                    {metrics.cpuLoad.map((l) => l.toFixed(2)).join(", ")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CPU Temp (°C)</TableCell>
                  <TableCell>
                    {metrics.cpuTemp !== null
                      ? metrics.cpuTemp.toFixed(1)
                      : "N/A"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Memory Used / Total</TableCell>
                  <TableCell>
                    {(
                      (metrics.totalMem - metrics.freeMem) /
                      1024 /
                      1024
                    ).toFixed(0)}{" "}
                    MB / {(metrics.totalMem / 1024 / 1024).toFixed(0)} MB
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Disk (root)</TableCell>
                  <TableCell>
                    {metrics.disk
                      ? `${metrics.disk.used} / ${metrics.disk.size} (${metrics.disk.percent})`
                      : "N/A"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Uptime</TableCell>
                  <TableCell>{Math.floor(metrics.uptime / 60)} min</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Platform</TableCell>
                  <TableCell>
                    {metrics.platform} ({metrics.arch})
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Hostname</TableCell>
                  <TableCell>{metrics.hostname}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        ) : null}
      </Paper>
    </Container>
  );
}
