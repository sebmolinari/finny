import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
} from "@mui/material";
import StyledDataGrid from "../components/StyledDataGrid";
import { ToolbarButton } from "@mui/x-data-grid";
import LoadingSpinner from "../components/LoadingSpinner";
import PageContainer from "../components/PageContainer";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShowChart as ShowChartIcon,
  Refresh as RefreshIcon,
  CloseRounded as CloseIcon,
} from "@mui/icons-material";
import { assetAPI, settingsAPI, constantsAPI } from "../api/api";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatNumber";
import {
  formatDatetimeInTimezone,
  getTodayInTimezone,
  formatDate,
} from "../utils/dateUtils";
import { useAuth } from "../auth/AuthContext";
import AuditFieldsDisplay from "../components/AuditFieldsDisplay";

export default function Assets() {
  const theme = useTheme();
  const { user } = useAuth();
  const isAdminOrSuperuser = user && ["admin", "superuser"].includes(user.role);
  const [assets, setAssets] = useState([]);
  const [userTimezone, setUserTimezone] = useState();
  const [userDateFormat, setUserDateFormat] = useState();
  const [validAssetTypes, setValidAssetTypes] = useState([]);
  const [validPriceSources, setValidPriceSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    asset_type: "",
    currency: "USD",
    price_source: "",
    price_symbol: "",
    price_factor: "",
    active: true,
  });

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAll({
        includeInactive: true,
      });
      const assetsWithPrices = await Promise.all(
        response.data.map(async (asset) => {
          try {
            const priceResponse = await assetAPI.getLatestPrice(asset.id);
            return { ...asset, currentPrice: priceResponse.data?.price };
          } catch {
            return { ...asset, currentPrice: null };
          }
        }),
      );
      setAssets(assetsWithPrices);
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
  }, [user, loadAssets]);

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
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        symbol: asset.symbol,
        name: asset.name,
        asset_type: asset.asset_type,
        currency: asset.currency,
        price_source: asset.price_source,
        price_symbol: asset.price_symbol,
        price_factor: asset.price_factor,
        active: asset.active !== 0,
      });
    } else {
      setEditingAsset(null);
      setFormData({
        symbol: "",
        name: "",
        asset_type: "",
        currency: "USD",
        price_source: "",
        price_symbol: "",
        price_factor: "",
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
  };

  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [priceData, setPriceData] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceFormData, setPriceFormData] = useState({
    date: getTodayInTimezone(userTimezone),
    price: "",
  });

  // Update price form date when timezone is loaded
  useEffect(() => {
    if (userTimezone) {
      setPriceFormData((prev) => ({
        ...prev,
        date: getTodayInTimezone(userTimezone),
      }));
    }
  }, [userTimezone]);

  const handleSubmit = async () => {
    try {
      if (editingAsset) {
        await assetAPI.update(editingAsset.id, formData);
        toast.success("Asset updated successfully");
      } else {
        await assetAPI.create(formData);
        toast.success("Asset created successfully");
      }
      handleCloseDialog();
      loadAssets();
    } catch (error) {
      console.error("Error saving asset:", error);
      const responseData = error.response?.data;

      // Check if there are detailed validation errors
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        // Display each validation error
        responseData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        // Fallback to generic message
        toast.error(responseData?.message || "Failed to save asset");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await assetAPI.delete(id);
        toast.success("Asset deleted successfully");
        loadAssets();
      } catch (error) {
        handleApiError(error, "Failed to delete asset");
      }
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
    try {
      const response = await assetAPI.getPrices(asset.id);
      setPriceData(response.data);
    } catch (error) {
      handleApiError(error, "Failed to load price data");
    }
    setOpenPriceDialog(true);
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

  const handleClosePriceDialog = () => {
    setOpenPriceDialog(false);
    setSelectedAsset(null);
    setPriceData([]);
    setEditingPrice(null);
    setPriceFormData({
      date: getTodayInTimezone(userTimezone),
      price: "",
      source: "manual",
    });
  };

  const handleAddPrice = async () => {
    try {
      if (editingPrice) {
        await assetAPI.updatePrice(
          selectedAsset.id,
          editingPrice.id,
          priceFormData,
        );
        toast.success("Price updated successfully");
        setEditingPrice(null);
      } else {
        await assetAPI.addPrice(selectedAsset.id, priceFormData);
        toast.success("Price added successfully");
      }
      const response = await assetAPI.getPrices(selectedAsset.id);
      setPriceData(response.data);
      setPriceFormData({
        date: getTodayInTimezone(userTimezone),
        price: "",
        source: "manual",
      });
      loadAssets();
    } catch (error) {
      console.error("Error saving price:", error);
      const responseData = error.response?.data;

      // Check if there are detailed validation errors
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        // Display each validation error
        responseData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        // Fallback to generic message
        const errorMessage =
          responseData?.message ||
          (editingPrice ? "Failed to update price" : "Failed to add price");
        toast.error(errorMessage);
      }
    }
  };

  const handleEditPrice = (price) => {
    setEditingPrice(price);
    setPriceFormData({
      date: price.date,
      price: price.price,
      source: "manual",
    });
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setPriceFormData({
      date: getTodayInTimezone(userTimezone),
      price: "",
    });
  };

  const handleDeletePrice = async (priceId) => {
    if (window.confirm("Are you sure you want to delete this price entry?")) {
      try {
        await assetAPI.deletePrice(selectedAsset.id, priceId);
        toast.success("Price deleted successfully");
        const response = await assetAPI.getPrices(selectedAsset.id);
        setPriceData(response.data);
        loadAssets();
      } catch (error) {
        handleApiError(error, "Failed to delete price");
      }
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
          ? formatDatetimeInTimezone(
              params.value || params.row.price_created_at,
              userDateFormat,
              userTimezone,
            )
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
        return isAdminOrSuperuser ? (
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
            {isAdminOrSuperuser && (
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

  const columnsPriceData = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => formatDate(params.row.date, userDateFormat),
    },
    {
      field: "updated_at",
      headerName: "Last Updated",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) =>
        formatDatetimeInTimezone(
          params.row.updated_at || params.row.created_at,
          userDateFormat,
          userTimezone,
        ),
    },
    {
      field: "price",
      headerName: "Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(parseFloat(params.row.price), 4),
    },
    {
      field: "actions",
      headerName: "Actions",
      headerAlign: "center",
      align: "center",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        isAdminOrSuperuser ? (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => handleEditPrice(params.row)}
              title="Edit"
              color="primary"
              sx={{ padding: "4px" }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeletePrice(params.row.id)}
              title="Delete"
              color="error"
              sx={{ padding: "4px" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
  ];

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <PageContainer title="Assets" subtitle="Manage tracked assets">
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
                <Tooltip title="Add asset">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleOpenDialog()}
                  >
                    <AddIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
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
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
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
          {editingAsset ? "Edit Asset" : "Add Asset"}
          <IconButton size="small" onClick={handleCloseDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="asset-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
          >
            <TextField
              label="Symbol"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  symbol: e.target.value.toUpperCase(),
                })
              }
              fullWidth
              required
              disabled={!!editingAsset}
              helperText="Ticker symbol (e.g., AAPL, VTSAX, BTC)"
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
              helperText="Full name of the asset"
            />
            <FormControl fullWidth required>
              <InputLabel>Asset Type</InputLabel>
              <Select
                value={formData.asset_type}
                onChange={(e) =>
                  setFormData({ ...formData, asset_type: e.target.value })
                }
                label="Asset Type"
              >
                {validAssetTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {LABELS[type] ??
                      type.charAt(0).toUpperCase() +
                        type.slice(1).replace(/([A-Z])/g, " $1")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                label="Currency"
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="ARS">ARS</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Price Source</InputLabel>
              <Select
                value={formData.price_source}
                onChange={(e) =>
                  setFormData({ ...formData, price_source: e.target.value })
                }
                label="Price Source"
              >
                {validPriceSources.map((src) => (
                  <MenuItem key={src} value={src}>
                    {src}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Price Symbol"
              value={formData.price_symbol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_symbol: e.target.value,
                })
              }
              fullWidth
              helperText="Alias Symbol used by the price source API (e.g., BTC for Yahoo, bitcoin for CoinGecko)"
            />
            <TextField
              label="Price Factor"
              type="number"
              value={formData.price_factor}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_factor: e.target.value,
                })
              }
              fullWidth
              slotProps={{ step: "0.01", min: "0" }}
              helperText="Factor to divide the fetched price by"
            />
            {isAdminOrSuperuser && (
              <FormControlLabel
                control={
                  <Switch
                    checked={!!formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    color="primary"
                  />
                }
                label={formData.active ? "Active" : "Inactive"}
              />
            )}
            {editingAsset && (
              <AuditFieldsDisplay
                item={editingAsset}
                userTimezone={userTimezone}
                userDateFormat={userDateFormat}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button type="submit" variant="contained" form="asset-form">
            {editingAsset ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openPriceDialog}
        onClose={handleClosePriceDialog}
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
          Manage Prices - {selectedAsset?.symbol} ({selectedAsset?.name})
          <IconButton size="small" onClick={handleClosePriceDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {isAdminOrSuperuser && (
              <>
                <Typography variant="h6" gutterBottom>
                  {editingPrice ? "Edit Price" : "Add New Price"}
                </Typography>
                <Box
                  component="form"
                  id="price-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddPrice();
                  }}
                  sx={{ display: "flex", gap: 2, mb: 3 }}
                >
                  <TextField
                    label="Date"
                    type="date"
                    value={priceFormData.date}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        date: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                  <TextField
                    label="Price"
                    type="number"
                    value={priceFormData.price}
                    onChange={(e) =>
                      setPriceFormData({
                        ...priceFormData,
                        price: e.target.value,
                      })
                    }
                    slotProps={{ step: "0.01", min: "0" }}
                    required
                  />
                  <Button type="submit" variant="contained" form="price-form">
                    {editingPrice ? "Update" : "Add"}
                  </Button>
                  {editingPrice && (
                    <Button variant="outlined" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                </Box>
                {editingPrice && (
                  <AuditFieldsDisplay
                    item={editingPrice}
                    userTimezone={userTimezone}
                    userDateFormat={userDateFormat}
                  />
                )}
              </>
            )}

            <Paper sx={{ width: "100%" }}>
              <div style={{ height: 400, width: "100%" }}>
                <StyledDataGrid
                  label="Price History"
                  rows={priceData}
                  columns={columnsPriceData}
                  loading={loading}
                  autoHeight
                  disableRowSelectionOnClick
                  getRowId={(row) => row.id}
                  pageSize={25}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </div>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePriceDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
