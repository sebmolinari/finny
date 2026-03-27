import { useState, useEffect, useCallback } from "react";
import {
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
  LinearProgress,
  Dialog,
  InputAdornment,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  CloseRounded as CloseIcon,
  BalanceOutlined as BalanceIcon,
  BarChart as BarChartIcon,
  Calculate as SimulateIcon,
} from "@mui/icons-material";
import { allocationAPI, constantsAPI, assetAPI } from "../api/api";
import { useTheme } from "@mui/material/styles";
import { formatCurrency, formatPercent } from "../utils/formatNumber";
import { MetricCard } from "../components/data-display/StyledCard";
import {
  StyledTable,
  StyledHeaderCell,
} from "../components/data-display/StyledTable";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import PageContainer from "../components/layout/PageContainer";
import { fadeInUpSx } from "../utils/animations";

export default function AssetAllocation() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState([]);
  const [assetTargets, setAssetTargets] = useState([]);
  const [rebalancing, setRebalancing] = useState(null);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Simulation state
  const [simulationDeposit, setSimulationDeposit] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [includedAssetTypes, setIncludedAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    label: "",
    onConfirm: null,
  });

  // Load rebalancing recommendations. Accept an explicit include list
  // so callers can pass the computed set without waiting for state updates.
  const loadRebalancing = useCallback(
    async (includeList = null) => {
      try {
        const toSend =
          includeList && includeList.length > 0
            ? includeList
            : includedAssetTypes;
        const response = await allocationAPI.getRebalancing(toSend || []);
        setRebalancing(response.data);
      } catch (error) {
        console.error("Error loading rebalancing:", error);
        // Don't show error for rebalancing - it's optional
      }
    },
    [includedAssetTypes],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load asset types
      const constantsResponse = await constantsAPI.getByCategory("ASSET_TYPES");
      const assetTypesArray = constantsResponse.data || [];
      setAssetTypes(assetTypesArray);

      // Do not default to including every asset type. Instead, keep
      // `includedAssetTypes` empty unless there are existing saved
      // type-level targets — in that case default to those types so
      // previously configured targets remain visible.

      // Load all assets
      const assetsResponse = await assetAPI.getAll({ active: 1 });
      let allAssets = assetsResponse.data || [];

      // Load targets (ask backend to filter by included asset types)
      const targetsResponse =
        await allocationAPI.getTargets(includedAssetTypes);
      let existingTargets = targetsResponse.data.targets || [];

      // Client-side fallback: filter assets and targets to only included asset types
      if (includedAssetTypes && includedAssetTypes.length > 0) {
        const includedSet = new Set(
          includedAssetTypes.map((t) => String(t).toLowerCase()),
        );
        allAssets = allAssets.filter((a) =>
          includedSet.has((a.asset_type || "").toLowerCase()),
        );
        existingTargets = existingTargets.filter((t) => {
          if (t.asset_type)
            return includedSet.has(String(t.asset_type).toLowerCase());
          if (t.asset_asset_type)
            return includedSet.has(String(t.asset_asset_type).toLowerCase());
          return true;
        });
      }

      setAssets(allAssets);

      // Separate type-level and asset-level targets
      const typeTargets = existingTargets.filter(
        (t) => t.asset_type && !t.asset_id,
      );
      const assetLevelTargets = existingTargets.filter(
        (t) => !t.asset_type && t.asset_id,
      );

      // If the user hasn't explicitly selected included types, default
      // the included list to the set of already-saved type-level
      // targets (so previously configured targets remain visible).
      const existingTypeAssetTypes = Array.from(
        new Set(typeTargets.map((t) => t.asset_type).filter(Boolean)),
      );
      if (
        (!includedAssetTypes || includedAssetTypes.length === 0) &&
        existingTypeAssetTypes.length > 0
      ) {
        setIncludedAssetTypes(existingTypeAssetTypes);
      }

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

      // Only display types that are explicitly included or already
      // exist as saved type-level targets. Do NOT default to showing
      // every available `assetTypesArray`.
      const displayedAssetTypes =
        includedAssetTypes && includedAssetTypes.length > 0
          ? includedAssetTypes
          : existingTypeAssetTypes;

      const initializedTargets = (displayedAssetTypes || []).map(
        (assetType) =>
          targetMap[assetType] || {
            id: null,
            asset_type: assetType,
            target_percentage: 0,
            notes: "",
          },
      );

      setTargets(initializedTargets);
      setAssetTargets(assetLevelTargets);

      // Recompute totalAllocated from the initialized (possibly filtered) type targets
      const total = initializedTargets.reduce(
        (sum, t) => sum + parseFloat(t.target_percentage || 0),
        0,
      );
      setTotalAllocated(total);

      // Load rebalancing recommendations using the displayed asset types
      // (pass explicit list to avoid stale state during the same render)
      await loadRebalancing(displayedAssetTypes);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      console.error("Error loading allocation data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadRebalancing, includedAssetTypes]);

  // Load data once on mount. Avoid reloading automatically whenever
  // `includedAssetTypes` changes because adding a type client-side
  // should not trigger a full data reload (which shows the global
  // loading spinner). Use explicit `Refresh` / `Save` to re-sync.
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTargetChange = (assetType, field, value) => {
    // Only recalculate totals when the target percentage changes.
    // For non-percentage fields (like notes) just update the target.
    if (field === "target_percentage") {
      setTargets((prev) => {
        const updated = prev.map((t) =>
          t.asset_type === assetType ? { ...t, [field]: value } : t,
        );
        const newTotal = updated.reduce(
          (sum, t) => sum + parseFloat(t.target_percentage || 0),
          0,
        );
        setTotalAllocated(newTotal);
        return updated;
      });
    } else {
      setTargets((prev) =>
        prev.map((t) =>
          t.asset_type === assetType ? { ...t, [field]: value } : t,
        ),
      );
    }
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
      if (includedAssetTypes && includedAssetTypes.length > 0) {
        const included = new Set(
          includedAssetTypes.map((t) => String(t).toLowerCase()),
        );
        if (!included.has((assetType || "").toLowerCase())) return;
      }
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
      let activeTypeTargets = targets.filter((t) => t.target_percentage > 0);
      let activeAssetTargets = assetTargets.filter(
        (t) => t.target_percentage > 0,
      );

      if (includedAssetTypes && includedAssetTypes.length > 0) {
        const included = new Set(
          includedAssetTypes.map((t) => String(t).toLowerCase()),
        );
        activeTypeTargets = activeTypeTargets.filter((t) =>
          included.has(String(t.asset_type).toLowerCase()),
        );
        activeAssetTargets = activeAssetTargets.filter((t) =>
          included.has(String(t.asset_asset_type).toLowerCase()),
        );
      }

      const allTargets = [...activeTypeTargets, ...activeAssetTargets];

      await allocationAPI.batchUpdateTargets(allTargets);
      await loadData(); // Reload to get updated data
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (label, onConfirm) => {
    setDeleteConfirm({ open: true, label, onConfirm });
  };

  const handleDelete = async (id) => {
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
        return <TrendingUpIcon fontSize="small" color="info" />;
      case "SELL":
        return <TrendingDownIcon fontSize="small" color="warning" />;
      default:
        return <RemoveIcon fontSize="small" color="action" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "BUY":
        return "info";
      case "SELL":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const remaining = 100 - totalAllocated;
  const isValid = totalAllocated <= 100;

  // Prepare rebalancing data for DataGrid displays
  const typeRecs = (rebalancing?.recommendations || []).filter(
    (r) => r.level === "type",
  );
  const assetRecs = (rebalancing?.recommendations || []).filter(
    (r) => r.level === "asset",
  );

  const typeRows = typeRecs.map((r, idx) => ({
    id: r.asset_type || idx,
    ...r,
  }));
  const assetRows = assetRecs.map((r, idx) => ({
    id: r.symbol ? `${r.symbol}-${idx}` : idx,
    ...r,
  }));

  const typeColumns = [
    {
      field: "asset_type",
      headerName: "Asset Type",
      headerAlign: "center",
      width: 150,
    },
    {
      field: "current",
      headerName: "Current",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Typography variant="body2">
            {formatPercent(p.row.current_percentage)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(p.row.current_value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "target",
      headerName: "Target",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Typography variant="body2">
            {formatPercent(p.row.target_percentage)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(p.row.target_value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "difference_percentage",
      headerName: "Difference",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Typography
          variant="body2"
          color={
            p.row.difference_percentage > 0
              ? theme.palette.success.main
              : p.row.difference_percentage < 0
                ? theme.palette.error.main
                : theme.palette.text.primary
          }
        >
          {p.row.difference_percentage > 0 ? "+" : ""}
          {formatPercent(p.row.difference_percentage)}
        </Typography>
      ),
    },
    {
      field: "action",
      headerName: "Action",
      headerAlign: "center",
      align: "right",
      width: 110,
      renderCell: (p) => (
        <Chip
          icon={getActionIcon(p.row.action)}
          label={p.row.action}
          color={getActionColor(p.row.action)}
          size="small"
        />
      ),
    },
    {
      field: "difference",
      headerName: "Amount",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Typography
          variant="body2"
          fontWeight="medium"
          color={
            p.row.difference > 0
              ? theme.palette.success.main
              : p.row.difference < 0
                ? theme.palette.error.main
                : theme.palette.text.primary
          }
        >
          {p.row.difference > 0 ? "+" : ""}
          {formatCurrency(Math.abs(p.row.difference || 0))}
        </Typography>
      ),
    },
  ];

  const assetColumns = [
    {
      field: "symbol",
      headerName: "Symbol",
      headerAlign: "center",
      width: 100,
    },
    {
      field: "asset_name",
      headerName: "Name",
      headerAlign: "center",
      width: 150,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 100,
      renderCell: (p) => <Chip label={p.value} size="small" />,
    },
    {
      field: "current",
      headerName: "Current",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Typography variant="body2">
            {p.row.current_percentage_within_type !== undefined
              ? formatPercent(p.row.current_percentage_within_type)
              : formatPercent(p.row.current_percentage)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(p.row.current_value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "target",
      headerName: "Target",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Typography variant="body2">
            {p.row.target_percentage_within_type !== undefined
              ? formatPercent(p.row.target_percentage_within_type)
              : formatPercent(p.row.target_percentage)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(p.row.target_value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "difference_percentage",
      headerName: "Difference",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Typography
          variant="body2"
          color={
            p.row.difference_percentage > 0
              ? theme.palette.success.main
              : p.row.difference_percentage < 0
                ? theme.palette.error.main
                : theme.palette.text.primary
          }
        >
          {p.row.difference_percentage > 0 ? "+" : ""}
          {formatPercent(p.row.difference_percentage)}
        </Typography>
      ),
    },
    {
      field: "action",
      headerName: "Action",
      width: 110,
      align: "center",
      headerAlign: "center",
      renderCell: (p) => (
        <Chip
          icon={getActionIcon(p.row.action)}
          label={p.row.action}
          color={getActionColor(p.row.action)}
          size="small"
        />
      ),
    },
    {
      field: "difference",
      headerName: "Amount",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => (
        <Typography
          variant="body2"
          fontWeight="medium"
          color={
            p.row.difference > 0
              ? theme.palette.success.main
              : p.row.difference < 0
                ? theme.palette.error.main
                : theme.palette.text.primary
          }
        >
          {p.row.difference > 0 ? "+" : ""}
          {formatCurrency(Math.abs(p.row.difference || 0))}
        </Typography>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* selection moved into Asset Type tab */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <MetricCard
            title="Total Allocated"
            value={formatPercent(totalAllocated)}
            subtitle={isValid ? "Within limits" : "Exceeds 100%"}
            valueColor={
              isValid ? theme.palette.primary.main : theme.palette.error.main
            }
            valueFontWeight={400}
            sx={{ ...fadeInUpSx(1) }}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <MetricCard
            title="Remaining"
            value={formatPercent(remaining)}
            subtitle={
              remaining >= 0 ? "Available to allocate" : "Over allocated"
            }
            valueColor={
              remaining > 0
                ? theme.palette.success.main
                : remaining < 0
                  ? theme.palette.error.main
                  : theme.palette.primary.main
            }
            valueFontWeight={400}
            sx={{ ...fadeInUpSx(2) }}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
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
            valueColor={
              rebalancing?.is_balanced
                ? theme.palette.success.main
                : theme.palette.warning.main
            }
            valueFontWeight={400}
            sx={{ ...fadeInUpSx(3) }}
          />
        </Grid>
      </Grid>
      {/* Target Allocation Form */}
      <Paper sx={{ p: 3, mb: 3, ...fadeInUpSx(4) }}>
        {/* Paper header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BarChartIcon sx={{ color: "#fff", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                Target Allocation
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Define how your portfolio should be distributed
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              size="small"
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isValid || hasInvalidAssetAllocations || saving}
              size="small"
            >
              {saving ? "Saving…" : "Save Targets"}
            </Button>
          </Box>
        </Box>

        {/* Allocation progress bar */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Allocated
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              color={isValid ? "success.main" : "error.main"}
            >
              {totalAllocated.toFixed(1)}% / 100%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(totalAllocated, 100)}
            color={
              totalAllocated > 100
                ? "error"
                : totalAllocated === 100
                  ? "success"
                  : "primary"
            }
            sx={{ height: 8, borderRadius: 4 }}
          />
          {remaining > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              {remaining.toFixed(1)}% remaining to allocate
            </Typography>
          )}
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab label="Asset Type Level" />
          <Tab label="Individual Asset Level" />
          <Tab
            icon={<SimulateIcon fontSize="small" />}
            iconPosition="start"
            label="Simulation"
          />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
              <Autocomplete
                value={selectedAssetType}
                onChange={(event, newValue) => setSelectedAssetType(newValue)}
                options={assetTypes.filter(
                  (t) => !targets.some((x) => x.asset_type === t),
                )}
                getOptionLabel={(option) => option}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Asset Type"
                    size="small"
                    placeholder="e.g. Equity, Bond, Cash…"
                  />
                )}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  if (!selectedAssetType) return;
                  if (targets.some((t) => t.asset_type === selectedAssetType)) {
                    setError("This asset type is already added");
                    return;
                  }
                  setTargets((prev) => [
                    ...prev,
                    {
                      id: null,
                      asset_type: selectedAssetType,
                      target_percentage: 0,
                      notes: "",
                    },
                  ]);
                  setIncludedAssetTypes((prev) =>
                    prev && prev.includes(selectedAssetType)
                      ? prev
                      : [...(prev || []), selectedAssetType],
                  );
                  setSelectedAssetType(null);
                }}
                disabled={!selectedAssetType}
              >
                Add Type
              </Button>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Set portfolio weights by asset type. Percentages should total
              100%.
            </Typography>
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
                          slotProps={{ min: 0, max: 100, step: 0.1 }}
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
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const removeLocal = () => {
                                setTargets((prev) =>
                                  prev.filter(
                                    (t) => t.asset_type !== target.asset_type,
                                  ),
                                );
                                setIncludedAssetTypes((prev) =>
                                  (prev || []).filter(
                                    (p) => p !== target.asset_type,
                                  ),
                                );
                              };
                              confirmDelete(target.asset_type, () =>
                                target.id
                                  ? handleDelete(target.id)
                                  : removeLocal(),
                              );
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Set allocation for individual assets{" "}
              <strong>within their asset type</strong>. Percentages should total
              100% within each type.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
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
                color="primary"
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
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            color: "text.disabled",
                          }}
                        >
                          <BarChartIcon sx={{ fontSize: 40 }} />
                          <Typography variant="body2" color="text.secondary">
                            No asset-level targets yet
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            Use the selector above to add individual assets
                          </Typography>
                        </Box>
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
                              slotProps={{ min: 0, max: 100, step: 0.1 }}
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
                                color="error"
                                onClick={() =>
                                  confirmDelete(
                                    `${target.symbol} target`,
                                    () =>
                                      target.id
                                        ? handleDelete(target.id)
                                        : handleRemoveAssetTarget(
                                            target.asset_id,
                                          ),
                                  )
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Show totals by asset type */}
                      {Object.entries(assetTypeTotals).length > 0 && (
                        <>
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              sx={{
                                pt: 2,
                                pb: 0.5,
                                borderTop: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="overline"
                                sx={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  color: "text.disabled",
                                }}
                              >
                                Totals by Asset Type
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {Object.entries(assetTypeTotals).map(
                            ([type, total]) => (
                              <TableRow
                                key={type}
                                sx={({ palette }) => ({
                                  bgcolor:
                                    total > 100
                                      ? `${palette.error.main}14`
                                      : total === 100
                                        ? `${palette.success.main}14`
                                        : palette.action.hover,
                                })}
                              >
                                <TableCell colSpan={3}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {type}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color={
                                      total > 100
                                        ? "error.main"
                                        : total === 100
                                          ? "success.main"
                                          : "warning.main"
                                    }
                                  >
                                    {total.toFixed(1)}%{" "}
                                    {total > 100
                                      ? "⚠ OVER"
                                      : total === 100
                                        ? "✓"
                                        : ""}
                                  </Typography>
                                </TableCell>
                                <TableCell colSpan={2} />
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

        {tabValue === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter a deposit amount to see how it should be split across your
              asset types to move toward your targets.
            </Typography>
            <Box
              sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 3 }}
            >
              <TextField
                label="Deposit Amount"
                type="number"
                value={simulationDeposit}
                onChange={(e) => setSimulationDeposit(e.target.value)}
                size="small"
                sx={{ width: 220 }}
                slotProps={{ min: "0", step: "100" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                startIcon={
                  simulating ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SimulateIcon />
                  )
                }
                onClick={async () => {
                  const deposit = parseFloat(simulationDeposit);
                  if (!deposit || deposit <= 0) {
                    return;
                  }
                  setSimulating(true);
                  try {
                    const res = await allocationAPI.simulate(
                      deposit,
                      includedAssetTypes || [],
                    );
                    setSimulationResult(res.data);
                  } catch (err) {
                    console.error("Simulation error", err);
                  } finally {
                    setSimulating(false);
                  }
                }}
                disabled={!simulationDeposit || simulating}
              >
                Simulate
              </Button>
            </Box>

            {simulationResult && (
              <>
                <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Deposit
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {formatCurrency(simulationResult.deposit_amount, 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Allocated
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color="success.main"
                    >
                      {formatCurrency(simulationResult.total_allocated, 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Unallocated
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color={
                        simulationResult.remaining_unallocated > 0
                          ? "warning.main"
                          : "text.secondary"
                      }
                    >
                      {formatCurrency(
                        simulationResult.remaining_unallocated,
                        0,
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Projected Portfolio
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {formatCurrency(
                        simulationResult.projected_portfolio_value,
                        0,
                      )}
                    </Typography>
                  </Box>
                </Box>

                <TableContainer>
                  <StyledTable size="small">
                    <TableHead>
                      <TableRow>
                        <StyledHeaderCell>Asset Type</StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Current Value
                        </StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Current %
                        </StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Target %
                        </StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Allocated
                        </StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Projected Value
                        </StyledHeaderCell>
                        <StyledHeaderCell align="right">
                          Projected %
                        </StyledHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {simulationResult.simulation.map((row) => {
                        const diff =
                          row.projected_percentage - row.target_percentage;
                        const projColor =
                          Math.abs(diff) <= 1
                            ? "success.main"
                            : Math.abs(diff) <= 3
                              ? "warning.main"
                              : "error.main";
                        return (
                          <TableRow key={row.asset_type}>
                            <TableCell>
                              <Chip label={row.asset_type} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.current_value, 0)}
                            </TableCell>
                            <TableCell align="right">
                              {row.current_percentage.toFixed(2)}%
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {row.target_percentage.toFixed(1)}%
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: "success.main", fontWeight: 600 }}
                            >
                              {row.allocated_deposit > 0
                                ? `+${formatCurrency(row.allocated_deposit, 0)}`
                                : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.projected_value, 0)}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip
                                title={`Target: ${row.target_percentage.toFixed(1)}% | Diff: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color={projColor}
                                >
                                  {row.projected_percentage.toFixed(1)}%
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </StyledTable>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {tabValue !== 2 && !isValid && (
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
          <Paper sx={{ p: 3, mb: 3, ...fadeInUpSx(5) }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: rebalancing.is_balanced
                    ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BalanceIcon sx={{ color: "#fff", fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  Asset Type Rebalancing
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Strategic allocation across asset classes
                </Typography>
              </Box>
            </Box>

            {rebalancing.is_balanced ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Portfolio is well-balanced! Rebalance intensity:{" "}
                {formatPercent(rebalancing.rebalance_intensity)} — within
                tolerance.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Rebalancing needed. Intensity:{" "}
                {formatPercent(rebalancing.rebalance_intensity)} exceeds
                tolerance of {formatPercent(rebalancing.rebalancing_tolerance)}.
              </Alert>
            )}

            <StyledDataGrid
              rows={typeRows}
              loading={loading}
              columns={typeColumns}
              disableToolbar
              rowHeight={70}
              getRowClassName={(params) =>
                params.row.is_balanced ? "" : "needs-rebalance"
              }
              sx={({ palette }) => ({
                "& .MuiDataGrid-row": { height: "70px !important" },
                "& .MuiDataGrid-row.needs-rebalance": {
                  backgroundColor: `${palette.warning.main}12 !important`,
                },
              })}
            />
          </Paper>
        )}
      {/* Rebalancing Recommendations - Asset Level (Tactical) */}
      {rebalancing?.has_targets &&
        rebalancing.recommendations.some((r) => r.level === "asset") && (
          <Paper sx={{ p: 3, mb: 3, ...fadeInUpSx(6) }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BarChartIcon sx={{ color: "#fff", fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  Individual Asset Rebalancing
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tactical allocation within each asset class
                </Typography>
              </Box>
            </Box>

            <StyledDataGrid
              rows={assetRows}
              loading={loading}
              columns={assetColumns}
              disableToolbar
              rowHeight={70}
              getRowClassName={(params) =>
                params.row.is_balanced ? "" : "needs-rebalance"
              }
              sx={({ palette }) => ({
                "& .MuiDataGrid-row": { maxHeight: "70px !important" },
                "& .MuiDataGrid-row.needs-rebalance": {
                  backgroundColor: `${palette.warning.main}12 !important`,
                },
              })}
            />
          </Paper>
        )}
      {!rebalancing?.has_targets && (
        <Alert severity="info">
          Set target allocations above to see rebalancing recommendations.
        </Alert>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() =>
          setDeleteConfirm({ open: false, label: "", onConfirm: null })
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 1,
          }}
        >
          Remove Target
          <IconButton
            size="small"
            onClick={() =>
              setDeleteConfirm({ open: false, label: "", onConfirm: null })
            }
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove <strong>{deleteConfirm.label}</strong> from your targets? Any
            saved data must be committed with <em>Save Targets</em> to persist.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() =>
              setDeleteConfirm({ open: false, label: "", onConfirm: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{
              bgcolor: "error.main",
              color: "#fff",
              "&:hover": { bgcolor: "error.dark" },
            }}
            onClick={() => {
              deleteConfirm.onConfirm?.();
              setDeleteConfirm({ open: false, label: "", onConfirm: null });
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
