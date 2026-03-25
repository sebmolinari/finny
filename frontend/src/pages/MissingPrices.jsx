import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Chip,
  TextField,
  Checkbox,
  LinearProgress,
} from "@mui/material";
import {
  PriceCheck as PriceCheckIcon,
  SearchOff as SearchOffIcon,
  CloudDownload as CloudDownloadIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { analyticsAPI } from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { MetricCard, StyledCard } from "../components/data-display/StyledCard";
import PageContainer from "../components/layout/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import {
  StyledTable,
  StyledHeaderRow,
  StyledHeaderCell,
} from "../components/data-display/StyledTable";
import { TableBody, TableCell, TableRow, TableHead } from "@mui/material";

const BATCH_SIZE = 50;

export default function MissingPrices() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [issues, setIssues] = useState(null); // { total_issues, issues: [] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin-only state
  const [excludedIds, setExcludedIds] = useState(new Set());
  // Map of "assetId|date" -> { asset_id, trade_date, price_symbol, fetched_price, status }
  const [fetchResults, setFetchResults] = useState(new Map());
  // Map of "assetId|date" -> string (user-edited price value)
  const [editedPrices, setEditedPrices] = useState(new Map());
  const [fetchProgress, setFetchProgress] = useState(null); // { done, total }
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [applyingPrices, setApplyingPrices] = useState(false);
  const [applyResult, setApplyResult] = useState(null); // { applied, errors } | { error }

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getMissingPrices();
      setIssues(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load missing prices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Group flat issues array by asset_id
  const groupedByAsset = issues
    ? Object.values(
        issues.issues.reduce((acc, issue) => {
          if (!acc[issue.asset_id]) {
            acc[issue.asset_id] = {
              asset_id: issue.asset_id,
              symbol: issue.symbol,
              price_symbol: issue.price_symbol,
              name: issue.name,
              asset_type: issue.asset_type,
              dates: [],
            };
          }
          acc[issue.asset_id].dates.push(issue.trade_date);
          return acc;
        }, {}),
      )
    : [];

  const toggleExclude = (assetId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleFetch = async () => {
    // Build flat list of items to fetch (one per date per non-excluded asset)
    const items = [];
    for (const group of groupedByAsset) {
      if (excludedIds.has(group.asset_id)) continue;
      for (const date of group.dates) {
        items.push({
          asset_id: group.asset_id,
          price_symbol: group.price_symbol || group.symbol,
          trade_date: date,
        });
      }
    }
    if (items.length === 0) return;

    setFetchingPrices(true);
    setFetchResults(new Map());
    setEditedPrices(new Map());
    setApplyResult(null);
    setFetchProgress({ done: 0, total: items.length });

    const accumulated = new Map();
    const initialEdits = new Map();

    try {
      // Process in batches of BATCH_SIZE
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const res = await analyticsAPI.fetchMissingPrices(batch);

        for (const r of res.data.results) {
          const key = `${r.asset_id}|${r.trade_date}`;
          accumulated.set(key, r);
          if (r.status === "ok" && r.fetched_price != null) {
            initialEdits.set(key, String(r.fetched_price));
          }
        }

        setFetchProgress({
          done: Math.min(i + BATCH_SIZE, items.length),
          total: items.length,
        });
        setFetchResults(new Map(accumulated));
        setEditedPrices(new Map(initialEdits));
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Fetch failed. Please try again.",
      );
    } finally {
      setFetchingPrices(false);
      setFetchProgress(null);
    }
  };

  const handlePriceEdit = (key, value) => {
    setEditedPrices((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  };

  const handleApply = async () => {
    // Build items from editedPrices map — only include those with a valid non-empty number
    const items = [];
    for (const [key, rawValue] of editedPrices.entries()) {
      if (!rawValue || rawValue.trim() === "") continue;
      const price = parseFloat(rawValue);
      if (isNaN(price) || price <= 0) continue;
      const [assetIdStr, trade_date] = key.split("|");
      items.push({ asset_id: parseInt(assetIdStr, 10), trade_date, price });
    }
    if (items.length === 0) return;

    setApplyingPrices(true);
    setApplyResult(null);
    try {
      const res = await analyticsAPI.applyMissingPrices(items);
      setApplyResult(res.data);
      // Refresh the issues list so the count updates
      await loadIssues();
      // Clear fetch results now that prices are applied
      setFetchResults(new Map());
      setEditedPrices(new Map());
    } catch (err) {
      setApplyResult({
        error: err.response?.data?.message || "Apply failed. Please try again.",
      });
    } finally {
      setApplyingPrices(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !issues) {
    return (
      <PageContainer>
        <Alert severity="error">{error}</Alert>
      </PageContainer>
    );
  }

  const totalIssues = issues?.total_issues ?? 0;
  const includedCount = groupedByAsset.filter(
    (g) => !excludedIds.has(g.asset_id),
  ).length;

  // Build flat list for the review table, sorted by symbol then date
  const reviewRows = [];
  for (const group of groupedByAsset) {
    if (excludedIds.has(group.asset_id)) continue;
    for (const date of group.dates) {
      const key = `${group.asset_id}|${date}`;
      const result = fetchResults.get(key);
      if (!result) continue;
      reviewRows.push({ ...result, symbol: group.symbol, key });
    }
  }
  reviewRows.sort((a, b) =>
    a.symbol !== b.symbol
      ? a.symbol.localeCompare(b.symbol)
      : a.trade_date.localeCompare(b.trade_date),
  );

  const fetchedOk = Array.from(fetchResults.values()).filter(
    (r) => r.status === "ok",
  ).length;
  const fetchedNotFound = Array.from(fetchResults.values()).filter(
    (r) => r.status === "not_found",
  ).length;

  const applyableCount = Array.from(editedPrices.values()).filter((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }).length;

  return (
    <PageContainer>
      <Alert severity="info" sx={{ mb: 3 }}>
        A <strong>missing price</strong> means no price record exists on or
        before the transaction date — the portfolio valuation engine has nothing
        to fall back on. If your earliest price for an asset is on{" "}
        <em>t&#8209;6</em> and you book a trade on <em>t&#8209;2</em>, that is{" "}
        <strong>not</strong> a missing price: the engine will use the{" "}
        <em>t&#8209;2</em> price. Only transactions that predate every existing
        price record are listed here.
      </Alert>

      {/* ── Summary metrics ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={fadeInUpSx(1)}>
            <MetricCard
              title="Missing Price Issues"
              value={totalIssues}
              icon={<SearchOffIcon color="warning" fontSize="small" />}
              subtitle={
                <Typography variant="caption" color="text.secondary">
                  across {groupedByAsset.length} asset
                  {groupedByAsset.length !== 1 ? "s" : ""}
                </Typography>
              }
            />
          </Box>
        </Grid>

        {isAdmin && (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={fadeInUpSx(2)}>
                <MetricCard
                  title="Assets to Fetch"
                  value={includedCount}
                  icon={<PriceCheckIcon color="primary" fontSize="small" />}
                  subtitle={
                    <Typography variant="caption" color="text.secondary">
                      {excludedIds.size} excluded
                    </Typography>
                  }
                />
              </Box>
            </Grid>

            {fetchResults.size > 0 && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={fadeInUpSx(3)}>
                    <MetricCard
                      title="Fetched from Yahoo"
                      value={fetchedOk}
                      icon={
                        <CloudDownloadIcon color="success" fontSize="small" />
                      }
                      subtitle={
                        <Typography variant="caption" color="text.secondary">
                          of {fetchResults.size} attempted
                        </Typography>
                      }
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={fadeInUpSx(4)}>
                    <MetricCard
                      title="Not Found"
                      value={fetchedNotFound}
                      icon={<SearchOffIcon color="error" fontSize="small" />}
                      subtitle={
                        <Typography variant="caption" color="text.secondary">
                          enter prices manually
                        </Typography>
                      }
                    />
                  </Box>
                </Grid>
              </>
            )}
          </>
        )}
      </Grid>

      {/* ── Issues by Asset ── */}
      <Box sx={{ ...fadeInUpSx(2), mb: 3 }}>
        <StyledCard>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Issues by Asset
            </Typography>
            {isAdmin && (
              <Typography variant="caption" color="text.secondary">
                Uncheck assets you manage manually — they will be skipped when
                fetching prices.
              </Typography>
            )}
          </Box>

          {totalIssues === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No missing prices found.
              </Typography>
            </Box>
          ) : (
            <StyledTable>
              <TableHead>
                <StyledHeaderRow>
                  {isAdmin && (
                    <StyledHeaderCell sx={{ width: 48 }}>
                      Include
                    </StyledHeaderCell>
                  )}
                  <StyledHeaderCell>Symbol</StyledHeaderCell>
                  <StyledHeaderCell>Name</StyledHeaderCell>
                  <StyledHeaderCell>Type</StyledHeaderCell>
                  <StyledHeaderCell>Missing Dates</StyledHeaderCell>
                </StyledHeaderRow>
              </TableHead>
              <TableBody>
                {groupedByAsset.map((group) => (
                  <TableRow key={group.asset_id} hover>
                    {isAdmin && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={!excludedIds.has(group.asset_id)}
                          onChange={() => toggleExclude(group.asset_id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {group.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {group.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={group.asset_type}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {group.dates.length} date
                        {group.dates.length !== 1 ? "s" : ""}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.dates.slice(0, 5).join(", ")}
                        {group.dates.length > 5
                          ? ` +${group.dates.length - 5} more`
                          : ""}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </StyledTable>
          )}
        </StyledCard>
      </Box>

      {/* ── Admin actions ── */}
      {isAdmin && totalIssues > 0 && (
        <>
          {/* Fetch button + progress */}
          <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="contained"
                startIcon={
                  fetchingPrices ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CloudDownloadIcon />
                  )
                }
                onClick={handleFetch}
                disabled={fetchingPrices || includedCount === 0}
              >
                {fetchingPrices ? "Fetching…" : "Fetch Prices from Yahoo"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadIssues}
                disabled={loading || fetchingPrices}
                size="small"
              >
                Refresh
              </Button>
            </Box>

            {fetchingPrices && fetchProgress && (
              <Box sx={{ maxWidth: 400 }}>
                <Typography variant="caption" color="text.secondary">
                  Processing {fetchProgress.done} of {fetchProgress.total}{" "}
                  dates…
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(fetchProgress.done / fetchProgress.total) * 100}
                  sx={{ mt: 0.5, borderRadius: 1 }}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Review table */}
          {reviewRows.length > 0 && (
            <Box sx={{ ...fadeInUpSx(1), mb: 3 }}>
              <StyledCard>
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Proposed Prices — Review Before Saving
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Edit any price before applying. Rows left blank are skipped.
                    Prices not found on Yahoo Finance are marked — enter
                    manually if known.
                  </Typography>
                </Box>

                <StyledTable>
                  <TableHead>
                    <StyledHeaderRow>
                      <StyledHeaderCell>Symbol</StyledHeaderCell>
                      <StyledHeaderCell>Date</StyledHeaderCell>
                      <StyledHeaderCell>Price</StyledHeaderCell>
                      <StyledHeaderCell>Status</StyledHeaderCell>
                    </StyledHeaderRow>
                  </TableHead>
                  <TableBody>
                    {reviewRows.map((row) => (
                      <TableRow key={row.key} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {row.trade_date}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={editedPrices.get(row.key) ?? ""}
                            onChange={(e) =>
                              handlePriceEdit(row.key, e.target.value)
                            }
                            placeholder="Enter price"
                            inputProps={{ min: 0, step: "any" }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              row.status === "ok"
                                ? "Fetched"
                                : "Not found — manual"
                            }
                            size="small"
                            color={row.status === "ok" ? "success" : "warning"}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </StyledTable>

                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    gap: 2,
                    flexDirection: "column",
                  }}
                >
                  {applyResult && (
                    <Alert
                      severity={applyResult.error ? "error" : "success"}
                      onClose={() => setApplyResult(null)}
                    >
                      {applyResult.error
                        ? applyResult.error
                        : `${applyResult.applied} price${applyResult.applied !== 1 ? "s" : ""} applied successfully.${applyResult.errors?.length ? ` ${applyResult.errors.length} error(s) — check logs.` : ""}`}
                    </Alert>
                  )}

                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={
                        applyingPrices ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      onClick={handleApply}
                      disabled={applyingPrices || applyableCount === 0}
                    >
                      {applyingPrices
                        ? "Applying…"
                        : `Apply ${applyableCount} Price${applyableCount !== 1 ? "s" : ""} to Database`}
                    </Button>
                  </Box>
                </Box>
              </StyledCard>
            </Box>
          )}
        </>
      )}
    </PageContainer>
  );
}
