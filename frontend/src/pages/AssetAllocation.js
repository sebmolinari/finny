import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Alert,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Autocomplete,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { allocationAPI, constantsAPI, assetAPI } from "../api/api";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import { MetricCard } from "../components/StyledCard";
import { StyledTable, StyledHeaderCell } from "../components/StyledTable";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AssetAllocation() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState([]);
  const [assetTargets, setAssetTargets] = useState([]);
  const [rebalancing, setRebalancing] = useState(null);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const loadRebalancing = useCallback(async () => {
    try {
      const response = await allocationAPI.getRebalancing();
      setRebalancing(response.data);
    } catch (error) {
      console.error("Error loading rebalancing:", error);
      // Don't show error for rebalancing - it's optional
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load asset types
      const constantsResponse = await constantsAPI.getByCategory("ASSET_TYPES");
      const assetTypesArray = constantsResponse.data || [];

      // Load all assets
      const assetsResponse = await assetAPI.getAll({ active: 1 });
      setAssets(assetsResponse.data || []);

      // Load targets
      const targetsResponse = await allocationAPI.getTargets();
      const existingTargets = targetsResponse.data.targets || [];
      setTotalAllocated(targetsResponse.data.total_allocated || 0);

      // Separate type-level and asset-level targets
      const typeTargets = existingTargets.filter(
        (t) => t.asset_type && !t.asset_id,
      );
      const assetLevelTargets = existingTargets.filter(
        (t) => !t.asset_type && t.asset_id,
      );

      // Initialize type targets with existing or empty
      const targetMap = {};
      typeTargets.forEach((t) => {
        targetMap[t.asset_type] = {
          id: t.id,
          asset_type: t.asset_type,
          target_percentage: t.target_percentage,
          notes: t.notes || "",
        };
      });

      const initializedTargets = assetTypesArray.map((assetType) => {
        return (
          targetMap[assetType] || {
            id: null,
            asset_type: assetType,
            target_percentage: 0,
            notes: "",
          }
        );
      });

      setTargets(initializedTargets);
      setAssetTargets(assetLevelTargets);

      // Load rebalancing recommendations
      await loadRebalancing();
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      console.error("Error loading allocation data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadRebalancing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTargetChange = (assetType, field, value) => {
    setTargets((prev) =>
      prev.map((t) =>
        t.asset_type === assetType ? { ...t, [field]: value } : t,
      ),
    );

    // Recalculate total (only type-level targets count toward 100%)
    const newTotal = targets.reduce((sum, t) => {
      if (t.asset_type === assetType) {
        return sum + parseFloat(value || 0);
      }
      return sum + parseFloat(t.target_percentage || 0);
    }, 0);
    setTotalAllocated(newTotal);
  };

  const handleAssetTargetChange = (assetId, field, value) => {
    setAssetTargets((prev) =>
      prev.map((t) => (t.asset_id === assetId ? { ...t, [field]: value } : t)),
    );
    // Asset-level targets don't affect the main total (they're within their type)
  };

  // Calculate totals by asset type for asset-level validation
  const getAssetTypeTotals = () => {
    const totals = {};
    assetTargets.forEach((target) => {
      const assetType = target.asset_asset_type;
      if (!totals[assetType]) {
        totals[assetType] = 0;
      }
      totals[assetType] += parseFloat(target.target_percentage || 0);
    });
    return totals;
  };

  const assetTypeTotals = getAssetTypeTotals();
  const hasInvalidAssetAllocations = Object.values(assetTypeTotals).some(
    (total) => total > 100,
  );

  const handleAddAssetTarget = () => {
    if (!selectedAsset) return;

    // Check if already exists
    if (assetTargets.some((t) => t.asset_id === selectedAsset.id)) {
      setError("This asset already has an allocation target");
      return;
    }

    setAssetTargets((prev) => [
      ...prev,
      {
        id: null,
        asset_id: selectedAsset.id,
        symbol: selectedAsset.symbol,
        asset_name: selectedAsset.name,
        asset_asset_type: selectedAsset.asset_type,
        target_percentage: 0,
        notes: "",
      },
    ]);
    setSelectedAsset(null);
  };

  const handleRemoveAssetTarget = (assetId) => {
    setAssetTargets((prev) => prev.filter((t) => t.asset_id !== assetId));
    // Asset-level targets don't affect the main total
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Filter out zero targets and combine both types
      const activeTypeTargets = targets.filter((t) => t.target_percentage > 0);
      const activeAssetTargets = assetTargets.filter(
        (t) => t.target_percentage > 0,
      );
      const allTargets = [...activeTypeTargets, ...activeAssetTargets];

      await allocationAPI.batchUpdateTargets(allTargets);
      await loadData(); // Reload to get updated data
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this target?")) {
      return;
    }

    try {
      await allocationAPI.deleteTarget(id);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "BUY":
        return <TrendingUpIcon fontSize="small" color="success" />;
      case "SELL":
        return <TrendingDownIcon fontSize="small" color="error" />;
      default:
        return <RemoveIcon fontSize="small" color="action" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "BUY":
        return "success";
      case "SELL":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const remaining = 100 - totalAllocated;
  const isValid = totalAllocated <= 100;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Asset Allocation & Rebalancing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Total Allocated"
            value={formatPercent(totalAllocated)}
            subtitle={isValid ? "Within limits" : "Exceeds 100%"}
            color={isValid ? "success" : "error"}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Remaining"
            value={formatPercent(remaining)}
            subtitle={
              remaining >= 0 ? "Available to allocate" : "Over allocated"
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Portfolio Status"
            value={rebalancing?.is_balanced ? "Balanced" : "Needs Rebalancing"}
            subtitle={
              rebalancing?.rebalance_intensity
                ? `Rebalance Intensity: ${formatPercent(
                    rebalancing.rebalance_intensity,
                  )}`
                : "No targets set"
            }
            color={rebalancing?.is_balanced ? "success" : "warning"}
          />
        </Grid>
      </Grid>

      {/* Target Allocation Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Target Allocation</Typography>
          <Box>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadData}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isValid || hasInvalidAssetAllocations || saving}
            >
              {saving ? "Saving..." : "Save Targets"}
            </Button>
          </Box>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          sx={{ mb: 2 }}
        >
          <Tab label="Asset Type Level" />
          <Tab label="Individual Asset Level" />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Set your portfolio allocation by asset type. These percentages
              should sum to 100% of your total portfolio.
            </Alert>
            <TableContainer>
              <StyledTable>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Asset Type</StyledHeaderCell>
                    <StyledHeaderCell align="right">Target %</StyledHeaderCell>
                    <StyledHeaderCell>Notes</StyledHeaderCell>
                    <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.asset_type}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {target.asset_type}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={target.target_percentage}
                          onChange={(e) =>
                            handleTargetChange(
                              target.asset_type,
                              "target_percentage",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          inputProps={{ min: 0, max: 100, step: 0.1 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Optional notes"
                          value={target.notes}
                          onChange={(e) =>
                            handleTargetChange(
                              target.asset_type,
                              "notes",
                              e.target.value,
                            )
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="center">
                        {target.id && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(target.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </StyledTable>
            </TableContainer>
          </>
        )}

        {tabValue === 1 && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Set allocation for individual assets{" "}
              <strong>within their asset type</strong>. Asset percentages should
              sum to 100% within each asset type.
            </Alert>
            <Box display="flex" gap={2} mb={2} alignItems="center">
              <Autocomplete
                value={selectedAsset}
                onChange={(event, newValue) => setSelectedAsset(newValue)}
                options={assets}
                getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
                renderInput={(params) => (
                  <TextField {...params} label="Select Asset" size="small" />
                )}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddAssetTarget}
                disabled={!selectedAsset}
              >
                Add Asset
              </Button>
            </Box>

            <TableContainer>
              <StyledTable>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Symbol</StyledHeaderCell>
                    <StyledHeaderCell>Name</StyledHeaderCell>
                    <StyledHeaderCell>Type</StyledHeaderCell>
                    <StyledHeaderCell align="right">
                      Target % (within type)
                    </StyledHeaderCell>
                    <StyledHeaderCell>Notes</StyledHeaderCell>
                    <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assetTargets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No asset-level targets. Add assets above to set
                          individual allocation targets.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {assetTargets.map((target) => (
                        <TableRow key={target.asset_id}>
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium">
                              {target.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {target.asset_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={target.asset_asset_type}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={target.target_percentage}
                              onChange={(e) =>
                                handleAssetTargetChange(
                                  target.asset_id,
                                  "target_percentage",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              placeholder="Optional notes"
                              value={target.notes}
                              onChange={(e) =>
                                handleAssetTargetChange(
                                  target.asset_id,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  target.id
                                    ? handleDelete(target.id)
                                    : handleRemoveAssetTarget(target.asset_id)
                                }
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Show totals by asset type */}
                      {Object.entries(assetTypeTotals).length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={6} sx={{ pt: 2 }}>
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                              >
                                Totals by Asset Type:
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {Object.entries(assetTypeTotals).map(
                            ([type, total]) => (
                              <TableRow
                                key={type}
                                sx={{
                                  backgroundColor:
                                    total > 100
                                      ? "rgba(255, 0, 0, 0.05)"
                                      : "rgba(0, 255, 0, 0.02)",
                                }}
                              >
                                <TableCell colSpan={3}>
                                  <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                  >
                                    {type}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color={
                                      total > 100
                                        ? "error"
                                        : total === 100
                                          ? "success.main"
                                          : "warning.main"
                                    }
                                  >
                                    {total.toFixed(1)}%{" "}
                                    {total > 100
                                      ? "(OVER)"
                                      : total === 100
                                        ? "✓"
                                        : ""}
                                  </Typography>
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                              </TableRow>
                            ),
                          )}
                        </>
                      )}
                    </>
                  )}
                </TableBody>
              </StyledTable>
            </TableContainer>
          </>
        )}

        {!isValid && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Total type-level allocation exceeds 100%. Please adjust your
            targets.
          </Alert>
        )}

        {hasInvalidAssetAllocations && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Asset-level allocations within some asset types exceed 100%:
            {Object.entries(assetTypeTotals)
              .filter(([_, total]) => total > 100)
              .map(([type, total]) => (
                <div key={type}>
                  {type}: {total.toFixed(1)}%
                </div>
              ))}
          </Alert>
        )}
      </Paper>

      {/* Rebalancing Recommendations - Asset Type Level (Strategic) */}
      {rebalancing?.has_targets &&
        rebalancing.recommendations.some((r) => r.level === "type") && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rebalancing Recommendations - Asset Type Level
            </Typography>

            {rebalancing.is_balanced ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Your portfolio is well-balanced! Rebalance intensity is within
                tolerance ({formatPercent(rebalancing.rebalance_intensity)}).
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your portfolio needs rebalancing. Rebalance intensity:{" "}
                {formatPercent(rebalancing.rebalance_intensity)} exceeds
                tolerance of {formatPercent(rebalancing.rebalancing_tolerance)}.
              </Alert>
            )}

            <TableContainer>
              <StyledTable>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Asset Type</StyledHeaderCell>
                    <StyledHeaderCell align="right">Current</StyledHeaderCell>
                    <StyledHeaderCell align="right">Target</StyledHeaderCell>
                    <StyledHeaderCell align="right">
                      Difference
                    </StyledHeaderCell>
                    <StyledHeaderCell align="center">Action</StyledHeaderCell>
                    <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rebalancing.recommendations
                    .filter((rec) => rec.level === "type")
                    .map((rec, idx) => (
                      <TableRow
                        key={idx}
                        sx={{
                          backgroundColor: rec.is_balanced
                            ? "inherit"
                            : "rgba(255, 0, 0, 0.05)",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium">
                            {rec.asset_type}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {formatPercent(rec.current_percentage)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatCurrency(rec.current_value)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {formatPercent(rec.target_percentage)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatCurrency(rec.target_value)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={
                              rec.difference_percentage > 0
                                ? "success.main"
                                : rec.difference_percentage < 0
                                  ? "error.main"
                                  : "text.primary"
                            }
                          >
                            {rec.difference_percentage > 0 ? "+" : ""}
                            {formatPercent(rec.difference_percentage)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getActionIcon(rec.action)}
                            label={rec.action}
                            color={getActionColor(rec.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            color={
                              rec.difference > 0
                                ? "success.main"
                                : rec.difference < 0
                                  ? "error.main"
                                  : "text.primary"
                            }
                          >
                            {rec.difference > 0 ? "+" : ""}
                            {formatCurrency(Math.abs(rec.difference))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </StyledTable>
            </TableContainer>
          </Paper>
        )}

      {/* Rebalancing Recommendations - Asset Level (Tactical) */}
      {rebalancing?.has_targets &&
        rebalancing.recommendations.some((r) => r.level === "asset") && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rebalancing Recommendations - Individual Asset Level
            </Typography>

            <TableContainer>
              <StyledTable>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Symbol</StyledHeaderCell>
                    <StyledHeaderCell>Name</StyledHeaderCell>
                    <StyledHeaderCell align="right">Current</StyledHeaderCell>
                    <StyledHeaderCell align="right">Target</StyledHeaderCell>
                    <StyledHeaderCell align="right">
                      Difference
                    </StyledHeaderCell>
                    <StyledHeaderCell align="center">Action</StyledHeaderCell>
                    <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rebalancing.recommendations
                    .filter((rec) => rec.level === "asset")
                    .map((rec, idx) => (
                      <TableRow
                        key={idx}
                        sx={{
                          backgroundColor: rec.is_balanced
                            ? "inherit"
                            : "rgba(255, 0, 0, 0.05)",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium">
                            {rec.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {rec.asset_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {rec.asset_type}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {rec.current_percentage_within_type !== undefined
                                ? formatPercent(
                                    rec.current_percentage_within_type,
                                  )
                                : formatPercent(rec.current_percentage)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatCurrency(rec.current_value)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {rec.target_percentage_within_type !== undefined
                                ? formatPercent(
                                    rec.target_percentage_within_type,
                                  )
                                : formatPercent(rec.target_percentage)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatCurrency(rec.target_value)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={
                              rec.difference_percentage > 0
                                ? "success.main"
                                : rec.difference_percentage < 0
                                  ? "error.main"
                                  : "text.primary"
                            }
                          >
                            {rec.difference_percentage > 0 ? "+" : ""}
                            {formatPercent(rec.difference_percentage)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getActionIcon(rec.action)}
                            label={rec.action}
                            color={getActionColor(rec.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            color={
                              rec.difference > 0
                                ? "success.main"
                                : rec.difference < 0
                                  ? "error.main"
                                  : "text.primary"
                            }
                          >
                            {rec.difference > 0 ? "+" : ""}
                            {formatCurrency(Math.abs(rec.difference))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </StyledTable>
            </TableContainer>
          </Paper>
        )}

      {!rebalancing?.has_targets && (
        <Alert severity="info">
          Set target allocations above to see rebalancing recommendations.
        </Alert>
      )}
    </Container>
  );
}
