import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Chip,
  IconButton,
  Switch,
  Typography,
  Tooltip,
} from "@mui/material";
import StyledDataGrid from "../components/StyledDataGrid";
import AssetDialog from "../components/AssetDialog";
import AssetPriceDialog from "../components/AssetPriceDialog";
import { ToolbarButton } from "@mui/x-data-grid";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShowChart as ShowChartIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { assetAPI, settingsAPI, constantsAPI } from "../api/api";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatNumber";
import { formatDatetimeInTimezone } from "../utils/dateUtils";
import { useAuth } from "../auth/AuthContext";
import ConfirmPhraseDialog from "../components/ConfirmPhraseDialog";

export default function Assets() {
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [assets, setAssets] = useState([]);
  const [userTimezone, setUserTimezone] = useState();
  const [userDateFormat, setUserDateFormat] = useState();
  const [validAssetTypes, setValidAssetTypes] = useState([]);
  const [validPriceSources, setValidPriceSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: null,
    symbol: "",
  });

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAll({
        includeInactive: true,
      });
      const sorted = [...response.data].sort((a, b) => {
        const typeCompare = (a.asset_type || "").localeCompare(
          b.asset_type || "",
        );
        if (typeCompare !== 0) return typeCompare;
        return (a.symbol || "").localeCompare(b.symbol || "");
      });
      setAssets(sorted);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
    loadValidAssetTypes();
    loadValidPriceSources();
    loadUserSettings();
  }, [loadAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadValidAssetTypes = async () => {
    try {
      const response = await constantsAPI.getByCategory("asset_types");
      setValidAssetTypes(response.data || []);
    } catch (error) {
      console.error("Error loading valid asset types:", error);
      toast.error("Failed to load asset types. Please refresh the page.");
      setValidAssetTypes([]);
    }
  };

  const loadUserSettings = async () => {
    const response = await settingsAPI.get();
    setUserTimezone(response.data.timezone);
    setUserDateFormat(response.data.date_format);
  };

  const loadValidPriceSources = async () => {
    try {
      const response = await constantsAPI.getByCategory("price_sources");
      setValidPriceSources(response.data || []);
    } catch (error) {
      console.error("Error loading valid price sources:", error);
      toast.error("Failed to load price sources. Please refresh the page.");
      setValidPriceSources([]);
    }
  };

  const handleOpenDialog = (asset = null) => {
    setEditingAsset(asset || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
  };

  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const handleDelete = (id) => {
    const asset = assets.find((a) => a.id === id);
    setDeleteConfirm({ open: true, id, symbol: asset?.symbol || String(id) });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null, symbol: "" });
    try {
      await assetAPI.delete(id);
      toast.success("Asset deleted successfully");
      loadAssets();
    } catch (error) {
      handleApiError(error, "Failed to delete asset");
    }
  };

  const handleToggleActive = async (asset) => {
    try {
      await assetAPI.update(asset.id, {
        symbol: asset.symbol,
        name: asset.name,
        asset_type: asset.asset_type,
        currency: asset.currency,
        price_source: asset.price_source,
        price_symbol: asset.price_symbol,
        price_factor: asset.price_factor,
        active: !asset.active,
      });
      toast.success(
        `Asset ${asset.symbol} ${asset.active ? "deactivated" : "activated"}`,
      );
      loadAssets();
    } catch (error) {
      handleApiError(error, "Failed to update asset");
    }
  };

  const handleOpenPriceDialog = async (asset) => {
    setSelectedAsset(asset);
    setOpenPriceDialog(true);
  };

  const handleClosePriceDialog = () => {
    setOpenPriceDialog(false);
    setSelectedAsset(null);
  };

  const handleRefreshAllPrices = async () => {
    try {
      toast.info("Refreshing prices for all assets...");
      const response = await assetAPI.refreshAllPrices();
      const results = response.data.results;

      toast.success(
        `Price refresh completed: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
      );

      if (results.errors.length > 0) {
        console.error("Price refresh errors:", results.errors);
      }

      loadAssets();
    } catch (error) {
      handleApiError(error, "Failed to refresh prices");
    }
  };

  const handleRefreshAssetPrice = async (assetId) => {
    try {
      const response = await assetAPI.refreshAssetPrice(assetId);
      toast.success(response.data.message);
      loadAssets();

      // Reload price dialog if open
      if (selectedAsset && selectedAsset.id === assetId) {
        const priceResponse = await assetAPI.getPrices(assetId);
        setPriceData(priceResponse.data);
      }
    } catch (error) {
      handleApiError(error, "Failed to refresh price");
    }
  };

  const LABELS = {
    realestate: "Real Estate",
    fixedincome: "Fixed Income",
  };

  const columns = [
    {
      field: "symbol",
      headerName: "Symbol",
      headerAlign: "center",
      flex: 1,
      minWidth: 50,
    },
    {
      field: "name",
      headerName: "Name",
      headerAlign: "center",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => {
        const asset_type = params.value || "";
        const bg =
          asset_type === "currency"
            ? "#e3f2fd"
            : asset_type === "equity"
              ? "#f3e5f5"
              : asset_type === "crypto"
                ? "#fff3e0"
                : asset_type === "fixedincome"
                  ? "#e0f2f1"
                  : asset_type === "realestate"
                    ? "#fce4ec"
                    : "#f5f5f5";
        const color =
          asset_type === "currency"
            ? "#1976d2"
            : asset_type === "equity"
              ? "#9c27b0"
              : asset_type === "crypto"
                ? "#ff9800"
                : asset_type === "fixedincome"
                  ? "#00796b"
                  : asset_type === "realestate"
                    ? "#c2185b"
                    : "#757575";
        return (
          <Chip
            label={asset_type.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: bg,
              color: color,
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        );
      },
    },
    {
      field: "currency",
      headerName: "Currency",
      headerAlign: "center",
      flex: 1,
      minWidth: 50,
    },
    {
      field: "price_source",
      headerName: "Source",
      headerAlign: "center",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "currentPrice",
      headerName: "Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      minWidth: 120,
      renderCell: (params) =>
        params.value ? formatCurrency(parseFloat(params.value), 4) : "—",
    },
    {
      field: "price_updated_at",
      headerName: "Updated",
      headerAlign: "center",
      flex: 1,
      minWidth: 150,
      renderCell: (params) =>
        params.value || params.row.price_created_at
          ? userDateFormat && userTimezone
            ? formatDatetimeInTimezone(
                params.value || params.row.price_created_at,
                userDateFormat,
                userTimezone,
              )
            : "—"
          : "—",
    },
    {
      field: "active",
      headerName: "Active",
      headerAlign: "center",
      align: "center",
      width: 100,
      type: "number",
      sortable: false,
      renderCell: (params) => {
        const asset = params.row;
        return isAdmin ? (
          <Switch
            checked={!!asset.active}
            onChange={() => handleToggleActive(asset)}
            color={asset.active ? "success" : "default"}
            slotProps={{ "aria-label": "Toggle active" }}
            size="small"
          />
        ) : asset.active ? (
          <Typography color={theme.palette.success.main} variant="body2">
            Active
          </Typography>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Inactive
          </Typography>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      headerAlign: "center",
      align: "center",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const asset = params.row;
        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => handleRefreshAssetPrice(asset.id)}
              title="Refresh Price"
              color="primary"
              disabled={!asset.active || asset.price_source === "manual"}
              sx={{ padding: "4px" }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
            {isAdmin && (
              <>
                <IconButton
                  size="small"
                  onClick={() => handleOpenPriceDialog(asset)}
                  title="Manage Prices"
                  color="success"
                  sx={{ padding: "4px" }}
                >
                  <ShowChartIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(asset)}
                  title="Edit"
                  color="primary"
                  sx={{ padding: "4px" }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(asset.id)}
                  title="Delete"
                  color="error"
                  sx={{ padding: "4px" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <PageContainer>
      <StyledDataGrid
        rows={assets}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        pageSize={25}
        rowsPerPageOptions={[25, 50, 100]}
        initialState={{
          filter: {
            filterModel: {
              items: [
                {
                  field: "active",
                  operator: "=",
                  value: 1,
                },
              ],
            },
          },
        }}
        slotProps={{
          toolbar: {
            actions: (
              <>
                {isAdmin && (
                  <Tooltip title="Add asset">
                    <ToolbarButton
                      color="primary"
                      onClick={() => handleOpenDialog()}
                    >
                      <AddIcon fontSize="small" />
                    </ToolbarButton>
                  </Tooltip>
                )}
                <Tooltip title="Refresh all prices">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleRefreshAllPrices()}
                  >
                    <RefreshIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
              </>
            ),
          },
        }}
      />
      <AssetDialog
        open={openDialog}
        editingAsset={editingAsset}
        validAssetTypes={validAssetTypes}
        validPriceSources={validPriceSources}
        userTimezone={userTimezone}
        userDateFormat={userDateFormat}
        isAdmin={isAdmin}
        onClose={handleCloseDialog}
        onSave={loadAssets}
      />
      <AssetPriceDialog
        open={openPriceDialog}
        asset={selectedAsset}
        userTimezone={userTimezone}
        userDateFormat={userDateFormat}
        isAdmin={isAdmin}
        onClose={handleClosePriceDialog}
        onPriceChange={loadAssets}
      />
      <ConfirmPhraseDialog
        open={deleteConfirm.open}
        title="Delete Asset"
        phrase={deleteConfirm.symbol}
        description="This will permanently delete the asset and all associated price data. Type the asset symbol to confirm."
        onConfirm={handleDeleteConfirmed}
        onClose={() => setDeleteConfirm({ open: false, id: null, symbol: "" })}
      />
    </PageContainer>
  );
}
