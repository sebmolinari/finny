import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import AssetDialog from "../components/dialogs/AssetDialog";
import AssetPriceDialog from "../components/dialogs/AssetPriceDialog";
import { ToolbarButton } from "@mui/x-data-grid";
import PageContainer from "../components/layout/PageContainer";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShowChart as ShowChartIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  CloseRounded as CloseIcon,
  PriceCheckRounded as PriceCheckIcon,
} from "@mui/icons-material";
import { assetAPI, constantsAPI } from "../api/api";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { fadeInUpSx } from "../utils/animations";
import { handleApiError } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatNumber";
import { formatDatetimeInTimezone } from "../utils/dateUtils";
import { useAuth } from "../auth/AuthContext";
import ConfirmPhraseDialog from "../components/dialogs/ConfirmPhraseDialog";
import { useUserSettings } from "../hooks/useUserSettings";

export default function Assets() {
  const theme = useTheme();
  const { user } = useAuth();
  const { timezone: userTimezone, dateFormat: userDateFormat } =
    useUserSettings();
  const isAdmin = user?.role === "admin";
  const [assets, setAssets] = useState([]);
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
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [openPriceImportDialog, setOpenPriceImportDialog] = useState(false);
  const [priceImportText, setPriceImportText] = useState("");
  const [priceImportResults, setPriceImportResults] = useState(null);
  const [priceImporting, setPriceImporting] = useState(false);

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

  const handleOpenImportDialog = () => {
    setOpenImportDialog(true);
    setImportText("");
    setImportResults(null);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
    setImportText("");
    setImportResults(null);
  };

  const getImportTemplate = () =>
    `Symbol,Name,Asset Type,Currency,Price Source,Price Symbol
AAPL,Apple Inc,equity,USD,yahoo,AAPL
BTC,Bitcoin,crypto,USD,coingecko,bitcoin
USDC,USD Coin,currency,USD,,`;

  const handleBulkImport = async () => {
    if (importing) return;
    try {
      setImporting(true);
      const lines = importText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        return;
      }
      const headerRow = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const assets = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const asset = {};
        headerRow.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case "symbol":
              asset.symbol = value;
              break;
            case "name":
              asset.name = value;
              break;
            case "asset type":
              asset.asset_type = value;
              break;
            case "currency":
              asset.currency = value;
              break;
            case "price source":
              asset.price_source = value || undefined;
              break;
            case "price symbol":
              asset.price_symbol = value || undefined;
              break;
            case "price factor":
              asset.price_factor = value ? parseFloat(value) : undefined;
              break;
            default:
              break;
          }
        });
        assets.push(asset);
      }
      const response = await assetAPI.bulkImport(assets);
      setImportResults(response.data.results);
      toast.success(response.data.message);
      const successCount = response.data.results.success.length;
      const errorCount = response.data.results.errors.length;
      if (successCount === assets.length && errorCount === 0) {
        loadAssets();
        setOpenImportDialog(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to import assets");
    } finally {
      setImporting(false);
    }
  };

  const handleOpenPriceImportDialog = () => {
    setOpenPriceImportDialog(true);
    setPriceImportText("");
    setPriceImportResults(null);
  };

  const handleClosePriceImportDialog = () => {
    if (priceImporting) return;
    setOpenPriceImportDialog(false);
    setPriceImportText("");
    setPriceImportResults(null);
  };

  const getPriceImportTemplate = () =>
    `Symbol,Date,Price\nAAPL,2026-03-28,172.50\nBTC,2026-03-28,68400.00`;

  const handleBulkImportPrices = async () => {
    if (priceImporting) return;
    try {
      setPriceImporting(true);
      const lines = priceImportText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        return;
      }
      const headerRow = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const prices = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const entry = {};
        headerRow.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case "symbol":
              entry.symbol = value;
              break;
            case "date":
              entry.date = value;
              break;
            case "price":
              entry.price = value ? parseFloat(value) : undefined;
              break;
            default:
              break;
          }
        });
        prices.push(entry);
      }
      const response = await assetAPI.bulkImportPrices(prices);
      setPriceImportResults(response.data.results);
      toast.success(response.data.message);
      const successCount = response.data.results.success.length;
      const errorCount = response.data.results.errors.length;
      if (successCount === prices.length && errorCount === 0) {
        loadAssets();
        setOpenPriceImportDialog(false);
      } else if (successCount > 0) {
        loadAssets();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to import prices");
    } finally {
      setPriceImporting(false);
    }
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
    return <LoadingSpinner />;
  }

  return (
    <PageContainer>
      <Box sx={{ ...fadeInUpSx(1) }}>
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
                    <>
                      <Tooltip title="Add asset">
                        <ToolbarButton
                          color="primary"
                          onClick={() => handleOpenDialog()}
                        >
                          <AddIcon fontSize="small" />
                        </ToolbarButton>
                      </Tooltip>
                      <Tooltip title="Import assets">
                        <ToolbarButton
                          color="primary"
                          onClick={() => handleOpenImportDialog()}
                        >
                          <UploadIcon fontSize="small" />
                        </ToolbarButton>
                      </Tooltip>
                      <Tooltip title="Import prices">
                        <ToolbarButton
                          color="primary"
                          onClick={handleOpenPriceImportDialog}
                        >
                          <PriceCheckIcon fontSize="small" />
                        </ToolbarButton>
                      </Tooltip>
                    </>
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
      </Box>
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
      <Dialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
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
          Bulk Import Assets
          <IconButton size="small" onClick={handleCloseImportDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Paste CSV data below. The first row should be headers. Columns:
              Symbol, Name, Asset Type, Currency, Price Source, Price Symbol
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setImportText(getImportTemplate())}
            >
              Load Example CSV
            </Button>
            <TextField
              label="CSV Data"
              multiline
              rows={12}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              fullWidth
              placeholder="Symbol,Name,Asset Type,Currency,Price Source,Price Symbol"
            />
            {importing && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <LoadingSpinner />
              </Box>
            )}
            {importResults && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Import Results:
                </Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.success.main}
                  gutterBottom
                >
                  ✓ {importResults.success.length} assets imported successfully
                </Typography>
                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color={theme.palette.error.main}
                      gutterBottom
                    >
                      ✗ {importResults.errors.length} assets failed:
                    </Typography>
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: "auto",
                        bgcolor: "#ffebee",
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {importResults.errors.map((err, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          Row {err.row}: {err.error}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={handleCloseImportDialog}
            disabled={importing}
          >
            Close
          </Button>
          <Button
            onClick={handleBulkImport}
            variant="contained"
            disabled={!importText.trim() || importing}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openPriceImportDialog}
        onClose={handleClosePriceImportDialog}
        maxWidth="md"
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
          Bulk Import Prices
          <IconButton size="small" onClick={handleClosePriceImportDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Paste CSV data below. The first row should be headers. Columns:
              Symbol, Date (YYYY-MM-DD), Price
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPriceImportText(getPriceImportTemplate())}
            >
              Load Example CSV
            </Button>
            <TextField
              label="CSV Data"
              multiline
              rows={12}
              value={priceImportText}
              onChange={(e) => setPriceImportText(e.target.value)}
              fullWidth
              placeholder="Symbol,Date,Price"
            />
            {priceImporting && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <LoadingSpinner />
              </Box>
            )}
            {priceImportResults && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Import Results:
                </Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.success.main}
                  gutterBottom
                >
                  ✓ {priceImportResults.success.length} prices imported
                  successfully
                </Typography>
                {priceImportResults.errors.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color={theme.palette.error.main}
                      gutterBottom
                    >
                      ✗ {priceImportResults.errors.length} prices failed:
                    </Typography>
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: "auto",
                        bgcolor: "#ffebee",
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {priceImportResults.errors.map((err, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          Row {err.row}: {err.error}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={handleClosePriceImportDialog}
            disabled={priceImporting}
          >
            Close
          </Button>
          <Button
            onClick={handleBulkImportPrices}
            variant="contained"
            disabled={!priceImportText.trim() || priceImporting}
          >
            {priceImporting ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
