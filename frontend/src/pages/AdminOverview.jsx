import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  PriceChange as PriceChangeIcon,
  Error as ErrorIcon,
  PersonOff as PersonOffIcon,
  DataUsage as DataUsageIcon,
  WarningAmber as WarningAmberIcon,
  PersonAdd as PersonAddIcon,
  History as HistoryIcon,
  EmojiEvents as TrophyIcon,
  NotificationsOff as NotificationsOffIcon,
  DeleteSweep as DeleteSweepIcon,
  Storage as StorageIcon,
  BackupTable as BackupTableIcon,
  DeleteForever as DeleteForeverIcon,
  Dataset as DatasetIcon,
  Schema as SchemaIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import {
  analyticsAPI,
  notificationsAPI,
  schedulerAPI,
  databaseAPI,
} from "../api/api";
import SystemConfigCard from "../components/SystemConfigCard";
import ConfirmPhraseDialog from "../components/ConfirmPhraseDialog";
import { formatNumber } from "../utils/formatNumber";
import { MetricCard, StyledCard } from "../components/StyledCard";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import {
  StyledTable,
  StyledHeaderRow,
  StyledHeaderCell,
} from "../components/StyledTable";
import { TableBody, TableCell, TableRow, TableHead } from "@mui/material";

const DELETE_CONFIRM_WORDS = [
  "apple", "river", "cloud", "tiger", "stone",
  "maple", "orbit", "flame", "cedar", "delta",
  "frost", "lunar", "noble", "pearl", "quartz",
];

export default function AdminOverview() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null); // { deleted: N } | { error: msg }
  const [purgingHistory, setPurgingHistory] = useState(false);
  const [purgeHistoryResult, setPurgeHistoryResult] = useState(null);
  const [checkpointing, setCheckpointing] = useState(false);
  const [checkpointResult, setCheckpointResult] = useState(null);
  const [seedingData, setSeedingData] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteDataResult, setDeleteDataResult] = useState(null);
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [deleteDataPhrase, setDeleteDataPhrase] = useState("delete all data");

  const handleSeedData = useCallback(async () => {
    setSeedingData(true);
    setSeedResult(null);
    try {
      const res = await databaseAPI.seedSampleData();
      setSeedResult({ created: res.data.created });
    } catch (err) {
      setSeedResult({ error: err.response?.data?.message || "Seed failed." });
    } finally {
      setSeedingData(false);
    }
  }, []);

  const handleDeleteAllData = useCallback(async () => {
    setDeletingData(true);
    setDeleteDataResult(null);
    setDeleteDataDialogOpen(false);
    try {
      const res = await databaseAPI.resetAllData();
      setDeleteDataResult({ deleted: res.data.deleted });
    } catch (err) {
      setDeleteDataResult({
        error: err.response?.data?.message || "Reset failed.",
      });
    } finally {
      setDeletingData(false);
    }
  }, []);

  const handleWalCheckpoint = useCallback(async () => {
    setCheckpointing(true);
    setCheckpointResult(null);
    try {
      const res = await databaseAPI.walCheckpoint();
      setCheckpointResult({
        checkpointed: res.data.checkpointed,
        log: res.data.log,
      });
    } catch (err) {
      setCheckpointResult({
        error: err.response?.data?.message || "Checkpoint failed.",
      });
    } finally {
      setCheckpointing(false);
    }
  }, []);

  const handlePurgeSchedulerHistory = useCallback(async () => {
    setPurgingHistory(true);
    setPurgeHistoryResult(null);
    try {
      const res = await schedulerAPI.purgeInstances();
      setPurgeHistoryResult({ deleted: res.data.deleted });
    } catch (err) {
      setPurgeHistoryResult({
        error: err.response?.data?.message || "Purge failed.",
      });
    } finally {
      setPurgingHistory(false);
    }
  }, []);

  const handlePurgeNotifications = useCallback(async () => {
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await notificationsAPI.purgeAll();
      setPurgeResult({ deleted: res.data.deleted });
    } catch (err) {
      setPurgeResult({
        error: err.response?.data?.message || "Purge failed.",
      });
    } finally {
      setPurging(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getAdminOverview();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">{error}</Alert>
      </PageContainer>
    );
  }

  const failedRefreshes = data?.failed_refreshes ?? [];
  const recentRefreshes = data?.recent_price_refreshes ?? [];
  const topUsers = data?.top_users ?? [];
  const recentRegistrations = data?.recent_registrations ?? [];
  const recentAudit = data?.recent_audit ?? [];
  const staleAssets = data?.stale_assets ?? [];
  const schemaMigrations = data?.schema_migrations ?? [];
  const recentSchedulerRuns = data?.recent_scheduler_runs ?? [];

  const priceCoveragePct =
    data?.assets?.total > 0
      ? Math.round((data.assets.with_prices / data.assets.total) * 100)
      : 0;

  return (
    <PageContainer>
      {/* ── Key stats ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Users */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(1)}>
            <MetricCard
              title="Total Users"
              value={formatNumber(data.users.total, 0, false)}
              icon={<PeopleIcon color="primary" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(data.users.active, 0, false)} active
                </Typography>
              }
            />
          </Box>
        </Grid>

        {/* Transactions */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(2)}>
            <MetricCard
              title="Total Transactions"
              value={formatNumber(data.transactions.total, 0, false)}
              icon={<ReceiptIcon color="secondary" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  across{" "}
                  {formatNumber(
                    data.transactions.users_with_transactions,
                    0,
                    false,
                  )}{" "}
                  user
                  {data.transactions.users_with_transactions !== 1 ? "s" : ""}
                </Typography>
              }
            />
          </Box>
        </Grid>

        {/* Assets */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(3)}>
            <MetricCard
              title="Active Assets"
              value={formatNumber(data.assets.total, 0, false)}
              icon={<InventoryIcon color="success" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(data.price_data.total_records, 0, false)} price
                  records
                </Typography>
              }
            />
          </Box>
        </Grid>

        {/* Users without transactions */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(4)}>
            <MetricCard
              title="Users w/o Transactions"
              value={formatNumber(data.users.no_transactions, 0, false)}
              icon={<PersonOffIcon color="warning" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  of {formatNumber(data.users.total, 0, false)} total users
                </Typography>
              }
            />
          </Box>
        </Grid>

        {/* Price data */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(5)}>
            <MetricCard
              title="Last Price Date"
              value={data.price_data.last_price_date ?? "—"}
              icon={<PriceChangeIcon color="warning" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(data.brokers.total, 0, false)} broker
                  {data.brokers.total !== 1 ? "s" : ""} configured
                </Typography>
              }
            />
          </Box>
        </Grid>

        {/* Price coverage */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={fadeInUpSx(6)}>
            <MetricCard
              title="Price Coverage"
              value={`${priceCoveragePct}%`}
              icon={<DataUsageIcon color="info" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(data.assets.with_prices, 0, false)} of{" "}
                  {formatNumber(data.assets.total, 0, false)} assets have prices
                </Typography>
              }
            />
          </Box>
        </Grid>
      </Grid>

      {/* ── Top users / Recent registrations / General audit ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Top users by transaction count */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={fadeInUpSx(7)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <TrophyIcon color="warning" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Top Users by Transactions
                  </Typography>
                </Box>
                {topUsers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No transactions recorded.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>#</StyledHeaderCell>
                        <StyledHeaderCell>User</StyledHeaderCell>
                        <StyledHeaderCell>Role</StyledHeaderCell>
                        <StyledHeaderCell align="right">Tx</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {topUsers.map((u, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {i + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {u.username}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.role}
                              size="small"
                              variant="outlined"
                              color={u.role === "admin" ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">
                              {formatNumber(u.tx_count, 0, false)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>

        {/* Recent registrations */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={fadeInUpSx(8)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <PersonAddIcon color="success" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Recent Registrations
                  </Typography>
                </Box>
                {recentRegistrations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No users found.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>User</StyledHeaderCell>
                        <StyledHeaderCell>Role</StyledHeaderCell>
                        <StyledHeaderCell>Joined</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {recentRegistrations.map((u, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {u.username}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block" }}
                            >
                              {u.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.role}
                              size="small"
                              variant="outlined"
                              color={u.role === "admin" ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString()
                                : "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── Stale asset prices ── */}
      {staleAssets.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12 }}>
            <Box sx={fadeInUpSx(9)}>
              <StyledCard>
                <Box sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <WarningAmberIcon color="warning" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Stale Asset Prices
                    </Typography>
                    <Chip
                      label={staleAssets.length}
                      size="small"
                      color="warning"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Active assets with no price data in the last 7 days
                    </Typography>
                  </Box>
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>Symbol</StyledHeaderCell>
                        <StyledHeaderCell>Name</StyledHeaderCell>
                        <StyledHeaderCell>Type</StyledHeaderCell>
                        <StyledHeaderCell>Last Price Date</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {staleAssets.map((a, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {a.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{a.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={a.asset_type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color={
                                a.last_price_date
                                  ? "warning.main"
                                  : "error.main"
                              }
                              fontWeight={600}
                            >
                              {a.last_price_date ?? "Never"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                </Box>
              </StyledCard>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* ── Recent price refresh activity ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={fadeInUpSx(10)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 1.5 }}
                >
                  Recent Price Refresh Activity
                </Typography>
                {recentRefreshes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No price refresh events found in the audit log.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>Time</StyledHeaderCell>
                        <StyledHeaderCell>User</StyledHeaderCell>
                        <StyledHeaderCell>Action</StyledHeaderCell>
                        <StyledHeaderCell>Status</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {recentRefreshes.map((r, i) => (
                        <TableRow
                          key={i}
                          sx={{
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.created_at
                                ? new Date(r.created_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {r.username ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {r.action_type}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.success ? "OK" : "Failed"}
                              size="small"
                              color={r.success ? "success" : "error"}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>

        {/* ── Failed refreshes / errors ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={fadeInUpSx(11)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <ErrorIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Recent Refresh Errors
                  </Typography>
                  {failedRefreshes.length > 0 && (
                    <Chip
                      label={failedRefreshes.length}
                      size="small"
                      color="error"
                    />
                  )}
                </Box>
                {failedRefreshes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No failed price refresh events recorded.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>Time</StyledHeaderCell>
                        <StyledHeaderCell>User</StyledHeaderCell>
                        <StyledHeaderCell>Error</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {failedRefreshes.map((r, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.created_at
                                ? new Date(r.created_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {r.username ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={r.error_message ?? ""}
                            >
                              {r.error_message ?? "Unknown error"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── Recent audit activity ── */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Box sx={fadeInUpSx(12)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <HistoryIcon fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Recent Activity
                  </Typography>
                </Box>
                {recentAudit.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No audit events found.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>Time</StyledHeaderCell>
                        <StyledHeaderCell>User</StyledHeaderCell>
                        <StyledHeaderCell>Action</StyledHeaderCell>
                        <StyledHeaderCell>Table</StyledHeaderCell>
                        <StyledHeaderCell>Record ID</StyledHeaderCell>
                        <StyledHeaderCell>IP Address</StyledHeaderCell>
                        <StyledHeaderCell>Status</StyledHeaderCell>
                        <StyledHeaderCell>Error</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {recentAudit.map((r, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.created_at
                                ? new Date(r.created_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {r.username ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {r.action_type}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.table_name ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.record_id ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.ip_address ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.success ? "OK" : "Fail"}
                              size="small"
                              color={r.success ? "success" : "error"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 260 }}>
                            {r.error_message ? (
                              <Typography
                                variant="caption"
                                color="error"
                                sx={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={r.error_message}
                              >
                                {r.error_message}
                              </Typography>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── Recent Scheduler Runs ── */}
      <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Box sx={fadeInUpSx(13)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <ScheduleIcon fontSize="small" color="secondary" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Recent Scheduler Runs
                  </Typography>
                </Box>
                {recentSchedulerRuns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No scheduler runs recorded.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>Scheduler</StyledHeaderCell>
                        <StyledHeaderCell>Type</StyledHeaderCell>
                        <StyledHeaderCell>Scheduled</StyledHeaderCell>
                        <StyledHeaderCell>Executed</StyledHeaderCell>
                        <StyledHeaderCell>Attempt</StyledHeaderCell>
                        <StyledHeaderCell>Status</StyledHeaderCell>
                        <StyledHeaderCell>Error</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {recentSchedulerRuns.map((r, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {r.scheduler_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.scheduled_run_at
                                ? new Date(r.scheduled_run_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.executed_at
                                ? new Date(r.executed_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.attempt}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.status}
                              size="small"
                              color={
                                r.status === "success"
                                  ? "success"
                                  : r.status === "failed"
                                    ? "error"
                                    : "default"
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            {r.error_message ? (
                              <Typography
                                variant="caption"
                                color="error"
                                sx={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={r.error_message}
                              >
                                {r.error_message}
                              </Typography>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── Schema Migrations ── */}
      <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Box sx={fadeInUpSx(14)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <SchemaIcon fontSize="small" color="info" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Schema Migrations
                  </Typography>
                  <Chip
                    label={schemaMigrations.length}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Box>
                {schemaMigrations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No migrations recorded.
                  </Typography>
                ) : (
                  <StyledTable size="small">
                    <TableHead>
                      <StyledHeaderRow>
                        <StyledHeaderCell>#</StyledHeaderCell>
                        <StyledHeaderCell>Filename</StyledHeaderCell>
                        <StyledHeaderCell>Applied At</StyledHeaderCell>
                      </StyledHeaderRow>
                    </TableHead>
                    <TableBody>
                      {schemaMigrations.map((m, i) => (
                        <TableRow
                          key={i}
                          sx={{ "&:hover": { bgcolor: "action.hover" } }}
                        >
                          <TableCell>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {i + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600}>
                              {m.filename}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {m.applied_at
                                ? new Date(m.applied_at).toLocaleString()
                                : "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )}
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── Admin Tools ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Box sx={fadeInUpSx(14)}>
            <StyledCard>
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <NotificationsOffIcon color="warning" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Admin Tools
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Tooltip title="Deletes all notifications (read and unread) for your account so fresh alerts are generated on the next poll cycle.">
                    <span>
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        startIcon={
                          purging ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <NotificationsOffIcon fontSize="small" />
                          )
                        }
                        onClick={handlePurgeNotifications}
                        disabled={purging}
                      >
                        Purge All Notifications
                      </Button>
                    </span>
                  </Tooltip>
                  {purgeResult && !purgeResult.error && (
                    <Alert severity="success" sx={{ py: 0, px: 1 }}>
                      {purgeResult.deleted} notification
                      {purgeResult.deleted !== 1 ? "s" : ""} deleted.
                    </Alert>
                  )}
                  {purgeResult?.error && (
                    <Alert severity="error" sx={{ py: 0, px: 1 }}>
                      {purgeResult.error}
                    </Alert>
                  )}
                  <Tooltip title="Deletes all scheduler execution history (scheduler_instances table). Schedulers themselves are not affected.">
                    <span>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={
                          purgingHistory ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <DeleteSweepIcon fontSize="small" />
                          )
                        }
                        onClick={handlePurgeSchedulerHistory}
                        disabled={purgingHistory}
                      >
                        Purge Scheduler History
                      </Button>
                    </span>
                  </Tooltip>
                  {purgeHistoryResult && !purgeHistoryResult.error && (
                    <Alert severity="success" sx={{ py: 0, px: 1 }}>
                      {purgeHistoryResult.deleted} instance
                      {purgeHistoryResult.deleted !== 1 ? "s" : ""} deleted.
                    </Alert>
                  )}
                  {purgeHistoryResult?.error && (
                    <Alert severity="error" sx={{ py: 0, px: 1 }}>
                      {purgeHistoryResult.error}
                    </Alert>
                  )}
                  <Tooltip title="Runs a TRUNCATE WAL checkpoint — flushes all committed WAL frames to the main database file and resets the WAL file to zero bytes.">
                    <span>
                      <Button
                        variant="outlined"
                        color="info"
                        size="small"
                        startIcon={
                          checkpointing ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <StorageIcon fontSize="small" />
                          )
                        }
                        onClick={handleWalCheckpoint}
                        disabled={checkpointing}
                      >
                        Flush WAL
                      </Button>
                    </span>
                  </Tooltip>
                  {checkpointResult && !checkpointResult.error && (
                    <Alert severity="success" sx={{ py: 0, px: 1 }}>
                      {checkpointResult.checkpointed} page
                      {checkpointResult.checkpointed !== 1 ? "s" : ""}{" "}
                      checkpointed ({checkpointResult.log} in log).
                    </Alert>
                  )}
                  {checkpointResult?.error && (
                    <Alert severity="error" sx={{ py: 0, px: 1 }}>
                      {checkpointResult.error}
                    </Alert>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <DatasetIcon color="info" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Demo Data
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Use <strong>Load Sample Data</strong> to populate the app with
                  demo brokers, assets, prices, and transactions. To reset back
                  to a clean state, use <strong>Delete All Data</strong> — this
                  permanently removes all user data except the three base
                  currency assets (USD, USDARS_BNA, USDARS_CCL).
                </Alert>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Tooltip title="Creates sample brokers, assets, price history, and transactions from the built-in demo dataset. Skips already-existing assets.">
                    <span>
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        startIcon={
                          seedingData ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <BackupTableIcon fontSize="small" />
                          )
                        }
                        onClick={handleSeedData}
                        disabled={seedingData || deletingData}
                      >
                        Load Sample Data
                      </Button>
                    </span>
                  </Tooltip>
                  {seedResult && !seedResult.error && (
                    <Alert severity="success" sx={{ py: 0, px: 1 }}>
                      Loaded: {seedResult.created.brokers} brokers,{" "}
                      {seedResult.created.assets} assets,{" "}
                      {seedResult.created.priceData} prices,{" "}
                      {seedResult.created.transactions} transactions,{" "}
                      {seedResult.created.allocationTargets} allocation targets.
                    </Alert>
                  )}
                  {seedResult?.error && (
                    <Alert severity="error" sx={{ py: 0, px: 1 }}>
                      {seedResult.error}
                    </Alert>
                  )}

                  <Tooltip title="Permanently deletes all transactions, price data, assets (except USD, USDARS_BNA, USDARS_CCL), brokers, allocation targets, and audit logs.">
                    <span>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={
                          deletingData ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <DeleteForeverIcon fontSize="small" />
                          )
                        }
                        onClick={() => {
                          const word =
                            DELETE_CONFIRM_WORDS[
                              Math.floor(
                                Math.random() * DELETE_CONFIRM_WORDS.length,
                              )
                            ];
                          setDeleteDataPhrase(`delete all data - ${word}`);
                          setDeleteDataDialogOpen(true);
                        }}
                        disabled={deletingData || seedingData}
                      >
                        Delete All Data
                      </Button>
                    </span>
                  </Tooltip>
                  {deleteDataResult && !deleteDataResult.error && (
                    <Alert severity="success" sx={{ py: 0, px: 1 }}>
                      Deleted: {deleteDataResult.deleted.transactions}{" "}
                      transactions, {deleteDataResult.deleted.assets} assets,{" "}
                      {deleteDataResult.deleted.brokers} brokers.
                    </Alert>
                  )}
                  {deleteDataResult?.error && (
                    <Alert severity="error" sx={{ py: 0, px: 1 }}>
                      {deleteDataResult.error}
                    </Alert>
                  )}
                </Box>
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      {/* ── System Configuration ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SystemConfigCard />
        </Grid>
      </Grid>

      <ConfirmPhraseDialog
        open={deleteDataDialogOpen}
        title="Delete All Data"
        phrase={deleteDataPhrase}
        description="Permanently deletes all transactions, price data, assets (except USD, USDARS_BNA, USDARS_CCL), brokers, allocation targets, and audit logs. This cannot be undone."
        onConfirm={handleDeleteAllData}
        onClose={() => setDeleteDataDialogOpen(false)}
        confirmLabel="Delete All Data"
        confirmColor="error"
      />
    </PageContainer>
  );
}
