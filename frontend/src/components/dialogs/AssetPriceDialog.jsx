import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Button,
  Box,
  Paper,
  Typography,
} from "@mui/material";
import {
  CloseRounded as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ToolbarButton } from "@mui/x-data-grid";
import Tooltip from "@mui/material/Tooltip";
import { assetAPI } from "../../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../../utils/errorHandler";
import { getTodayInTimezone, formatDate } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/formatNumber";
import { formatDatetimeInTimezone } from "../../utils/dateUtils";
import StyledDataGrid from "../data-display/StyledDataGrid";
import AuditFieldsDisplay from "../data-display/AuditFieldsDisplay";
import ConfirmPhraseDialog from "./ConfirmPhraseDialog";

/**
 * Self-contained dialog for managing price history of a single asset.
 * All form state is local so the Assets page DataGrid never re-renders
 * on keystrokes here.
 */
export default function AssetPriceDialog({
  open,
  asset,
  userTimezone,
  userDateFormat,
  isAdmin,
  onClose,
  onPriceChange,
}) {
  const [priceData, setPriceData] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceFormData, setPriceFormData] = useState({
    date: getTodayInTimezone(userTimezone),
    price: "",
  });
  const [deletePriceConfirm, setDeletePriceConfirm] = useState({
    open: false,
    priceId: null,
  });
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Load prices whenever the dialog opens for a new asset
  useEffect(() => {
    if (!open || !asset) return;
    loadPrices();
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
    setEditingPrice(null);
    setSelectionModel({ type: "include", ids: new Set() });
  }, [open, asset]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrices = async () => {
    try {
      const response = await assetAPI.getPrices(asset.id);
      setPriceData(response.data);
    } catch (error) {
      handleApiError(error, "Failed to load price data");
    }
  };

  const handleAddPrice = async () => {
    try {
      if (editingPrice) {
        await assetAPI.updatePrice(asset.id, editingPrice.id, priceFormData);
        toast.success("Price updated successfully");
        setEditingPrice(null);
      } else {
        await assetAPI.addPrice(asset.id, priceFormData);
        toast.success("Price added successfully");
      }
      setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
      await loadPrices();
      onPriceChange();
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        responseData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(
          responseData?.message ||
            (editingPrice ? "Failed to update price" : "Failed to add price"),
        );
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
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
  };

  const handleDeletePrice = (priceId) => {
    setDeletePriceConfirm({ open: true, priceId });
  };

  const handleDeletePriceConfirmed = async () => {
    const { priceId } = deletePriceConfirm;
    setDeletePriceConfirm({ open: false, priceId: null });
    try {
      await assetAPI.deletePrice(asset.id, priceId);
      toast.success("Price deleted successfully");
      await loadPrices();
      onPriceChange();
    } catch (error) {
      handleApiError(error, "Failed to delete price");
    }
  };

  const selectedCount =
    selectionModel.type === "exclude"
      ? priceData.length - selectionModel.ids.size
      : selectionModel.ids.size;

  const getSelectedIds = () =>
    selectionModel.type === "exclude"
      ? priceData.filter((p) => !selectionModel.ids.has(p.id)).map((p) => p.id)
      : [...selectionModel.ids];

  const handleBulkDeleteConfirmed = async () => {
    setBulkDeleteConfirm(false);
    try {
      const ids = getSelectedIds();
      const { data } = await assetAPI.bulkDeletePrices(asset.id, ids);
      toast.success(`${data.deleted} price${data.deleted !== 1 ? "s" : ""} deleted`);
      setSelectionModel({ type: "include", ids: new Set() });
      await loadPrices();
      onPriceChange();
    } catch (error) {
      handleApiError(error, "Failed to delete prices");
    }
  };

  const handleClose = () => {
    setEditingPrice(null);
    setPriceData([]);
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
    setSelectionModel({ type: "include", ids: new Set() });
    onClose();
  };

  const columns = [
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
        isAdmin ? (
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

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 1,
          }}
        >
          Manage Prices — {asset?.symbol} ({asset?.name})
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {isAdmin && (
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
                      setPriceFormData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                  <TextField
                    label="Price"
                    type="number"
                    value={priceFormData.price}
                    onChange={(e) =>
                      setPriceFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
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
                  columns={columns}
                  autoHeight
                  checkboxSelection={isAdmin}
                  disableRowSelectionOnClick
                  rowSelectionModel={selectionModel}
                  onRowSelectionModelChange={(model) => setSelectionModel(model)}
                  getRowId={(row) => row.id}
                  pageSize={25}
                  rowsPerPageOptions={[10, 25, 50]}
                  slotProps={{
                    toolbar: {
                      actions: isAdmin && (
                        <Box sx={{ visibility: selectedCount > 0 ? "visible" : "hidden" }}>
                          <Tooltip title={`Delete ${selectedCount} selected`}>
                            <ToolbarButton color="error" onClick={() => setBulkDeleteConfirm(true)}>
                              <DeleteIcon fontSize="small" />
                            </ToolbarButton>
                          </Tooltip>
                        </Box>
                      ),
                    },
                  }}
                />
              </div>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmPhraseDialog
        open={deletePriceConfirm.open}
        title="Delete Price Entry"
        phrase="delete"
        description="This will permanently remove this price data point."
        confirmLabel="Delete"
        onConfirm={handleDeletePriceConfirmed}
        onClose={() => setDeletePriceConfirm({ open: false, priceId: null })}
      />

      <ConfirmPhraseDialog
        open={bulkDeleteConfirm}
        title={`Delete ${selectedCount} Price${selectedCount !== 1 ? "s" : ""}`}
        phrase="delete"
        description={`This will permanently remove ${selectedCount} price record${selectedCount !== 1 ? "s" : ""}.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDeleteConfirmed}
        onClose={() => setBulkDeleteConfirm(false)}
      />
    </>
  );
}
