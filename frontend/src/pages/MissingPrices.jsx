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
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
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
const REVIEW_CHUNK_SIZE = 100;

export default function MissingPrices() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [includeStale, setIncludeStale] = useState(false);
  const [issues, setIssues] = useState(null); // { total_issues, issues: [], stale_metadata }
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
  const [selectedYear, setSelectedYear] = useState(null);
  const [applyingPrices, setApplyingPrices] = useState(false);
  const [applyResult, setApplyResult] = useState(null); // { applied, errors } | { error }

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getMissingPrices(
        includeStale ? { includeStale: true } : {},
      );
      setIssues(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load missing prices.");
    } finally {
      setLoading(false);
    }
  }, [includeStale]);

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
              price_source: issue.price_source,
              name: issue.name,
              asset_type: issue.asset_type,
              dates: [],
              statuses: {},
            };
          }
          acc[issue.asset_id].dates.push(issue.trade_date);
          acc[issue.asset_id].statuses[issue.trade_date] = issue.status;
          return acc;
        }, {}),
      )
    : [];

  // Derive sorted list of years that have at least one missing date among included assets
  const availableYears = [
    ...new Set(
      groupedByAsset
        .filter((g) => !excludedIds.has(g.asset_id))
        .flatMap((g) => g.dates.map((d) => d.slice(0, 4))),
    ),
  ].sort();

  // Auto-exclude non-yahoo assets on initial load
  useEffect(() => {
    setExcludedIds(
      new Set(
        groupedByAsset
          .filter((g) => g.price_source && g.price_source !== "yahoo")
          .map((g) => g.asset_id),
      ),
    );
  }, [availableYears.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedYear valid whenever the available years list changes
  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear(null);
    } else if (selectedYear === null || !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears.join(","), selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExclude = (assetId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleFetch = async () => {
    // Build flat list of items to fetch for the selected year only
    const allItems = [];
    for (const group of groupedByAsset) {
      if (excludedIds.has(group.asset_id)) continue;
      for (const date of group.dates) {
        if (selectedYear && !date.startsWith(selectedYear)) continue;
        allItems.push({
          asset_id: group.asset_id,
          price_symbol: group.price_symbol || group.symbol,
          trade_date: date,
        });
      }
    }
    if (allItems.length === 0) return;

    // Only fetch the first REVIEW_CHUNK_SIZE items — user reviews and applies before continuing
    const chunk = allItems.slice(0, REVIEW_CHUNK_SIZE);

    setFetchingPrices(true);
    setFetchResults(new Map());
    setEditedPrices(new Map());
    setApplyResult(null);
    setFetchProgress({ done: 0, total: chunk.length });

    const accumulated = new Map();
    const initialEdits = new Map();

    try {
      // Process chunk in batches of BATCH_SIZE — accumulate all results before showing
      for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
        const batch = chunk.slice(i, i + BATCH_SIZE);
        const res = await analyticsAPI.fetchMissingPrices(batch);

        for (const r of res.data.results) {
          const key = `${r.asset_id}|${r.trade_date}`;
          accumulated.set(key, r);
          if (r.status === "ok" && r.fetched_price != null) {
            initialEdits.set(key, String(r.fetched_price));
          }
        }

        setFetchProgress({
          done: Math.min(i + BATCH_SIZE, chunk.length),
          total: chunk.length,
        });
      }

      // Only populate the review grid once all batches are complete
      setFetchResults(new Map(accumulated));
      setEditedPrices(new Map(initialEdits));
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

  const staleMetadata = issues?.stale_metadata;
  const hasExcludedManual =
    staleMetadata && staleMetadata.excluded_manual_count > 0;

  const nonYahooAssets = groupedByAsset.filter(
    (g) => g.price_source && g.price_source !== "yahoo",
  );

  return (
    <PageContainer>
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <FormControlLabel
            control={
              <Switch
                checked={includeStale}
                onChange={(e) => setIncludeStale(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="caption" noWrap>
                Detect stale prices
              </Typography>
            }
            labelPlacement="start"
            sx={{ mr: 0, ml: 1 }}
          />
        }
      >
        A <strong>missing price</strong> means no price record exists on or
        before the transaction date — the portfolio valuation engine has nothing
        to fall back on. If your earliest price for an asset is on{" "}
        <em>t&#8209;6</em> and you book a trade on <em>t&#8209;2</em>, that is{" "}
        <strong>not</strong> a missing price: the engine will use the{" "}
        <em>t&#8209;2</em> price. Only transactions that predate every existing
        price record are listed here.
        {includeStale && (
          <>
            <br />
            A <strong>stale price</strong> means the asset has at least one
            price record, but none more recent than today — the engine silently
            rolls the last known price forward. Enable this toggle to surface
            those gaps and fill them in.
          </>
        )}
      </Alert>

      {includeStale && hasExcludedManual && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Stale price detection excludes{" "}
          <strong>{staleMetadata.excluded_manual_count}</strong> asset
          {staleMetadata.excluded_manual_count !== 1 ? "s" : ""} with manual
          pricing:{" "}
          <strong>{staleMetadata.excluded_manual_symbols.join(", ")}</strong>.
          These must be updated manually.
        </Alert>
      )}

      {nonYahooAssets.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>
            {nonYahooAssets.length} asset
            {nonYahooAssets.length !== 1 ? "s" : ""} use a non-Yahoo price
            source
          </strong>{" "}
          (
          {nonYahooAssets
            .map((g) => `${g.symbol} — ${g.price_source}`)
            .join(", ")}
          ). Fetching from Yahoo Finance for these assets may return incorrect
          prices or no data at all, leading to inconsistencies with their
          existing price records. Consider filling those prices manually.
        </Alert>
      )}

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
                  <StyledHeaderCell>Price Source</StyledHeaderCell>
                  {includeStale && (
                    <StyledHeaderCell>Status</StyledHeaderCell>
                  )}
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
                    <TableCell>
                      {group.price_source && group.price_source !== "yahoo" ? (
                        <Chip
                          label={group.price_source}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {group.price_source || "yahoo"}
                        </Typography>
                      )}
                    </TableCell>
                    {includeStale && (
                      <TableCell>
                        {(() => {
                          const uniqueStatuses = [
                            ...new Set(Object.values(group.statuses)),
                          ];
                          return (
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              {uniqueStatuses.includes("no_price") && (
                                <Chip
                                  label="No Price"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              )}
                              {uniqueStatuses.includes("stale_price") && (
                                <Chip
                                  label="Stale"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              )}
                            </Box>
                          );
                        })()}
                      </TableCell>
                    )}
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
            <Alert severity="info" sx={{ mb: 1 }}>
              Fetching prices from Yahoo Finance is done{" "}
              <strong>one year at a time</strong>, up to{" "}
              <strong>{REVIEW_CHUNK_SIZE} dates per round</strong>. Review and
              apply each round before fetching the next — this avoids rate
              limits and keeps the review manageable.
            </Alert>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              {availableYears.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="year-select-label">Year</InputLabel>
                  <Select
                    labelId="year-select-label"
                    value={selectedYear ?? ""}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setFetchResults(new Map());
                      setEditedPrices(new Map());
                      setApplyResult(null);
                    }}
                    disabled={fetchingPrices}
                  >
                    {availableYears.map((y) => {
                      const count = groupedByAsset
                        .filter((g) => !excludedIds.has(g.asset_id))
                        .reduce(
                          (n, g) =>
                            n + g.dates.filter((d) => d.startsWith(y)).length,
                          0,
                        );
                      return (
                        <MenuItem key={y} value={y}>
                          {y}
                          {count > 0 ? ` (${count})` : ""}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
              {(() => {
                const totalForYear = selectedYear
                  ? groupedByAsset
                      .filter((g) => !excludedIds.has(g.asset_id))
                      .reduce(
                        (n, g) =>
                          n +
                          g.dates.filter((d) => d.startsWith(selectedYear))
                            .length,
                        0,
                      )
                  : 0;
                const chunkSize = Math.min(totalForYear, REVIEW_CHUNK_SIZE);
                const label = fetchingPrices
                  ? "Fetching…"
                  : totalForYear > REVIEW_CHUNK_SIZE
                    ? `Fetch Next ${chunkSize} of ${totalForYear} from Yahoo`
                    : `Fetch ${chunkSize > 0 ? chunkSize + " " : ""}${selectedYear ?? ""} Prices from Yahoo`;
                return (
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
                    disabled={fetchingPrices || includedCount === 0 || !selectedYear}
                  >
                    {label}
                  </Button>
                );
              })()}
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
